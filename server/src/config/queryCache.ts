import { createClient, type RedisClientType } from "redis"
import { env } from "./env.js"

/**
 * Short-TTL caching for expensive read queries.
 *
 * Redis was already a dependency here, but only for socket pub/sub and rate limiting — no query
 * result had ever been cached, so aggregate endpoints recomputed from scratch on every dashboard
 * load and lookup tables (stores, departments, categories) were re-queried on every page.
 *
 * Two rules this deliberately follows, both learned from `auditService.record`:
 *
 * 1. **A cache failure must never fail the request.** Every path here swallows Redis errors and
 *    falls through to the real query. A down cache makes the app slower, never broken.
 * 2. **Never cache something whose staleness is a correctness bug.** Permissions, anything
 *    scoped per-user by role, or a value the caller is about to write to — pick a TTL for how
 *    wrong the number is allowed to be, and prefer explicit invalidation for anything that has a
 *    clear "this just changed" moment.
 */

let client: RedisClientType | null = null
let connecting: Promise<void> | null = null
// After a failed connect, stop retrying on every request — otherwise a Redis outage turns every
// cached read into a connection attempt and the cache makes things slower than no cache at all.
let disabledUntil = 0
const DISABLE_MS = 30_000

const connect = async () => {
    if (client?.isReady) return
    if (Date.now() < disabledUntil) throw new Error("query cache temporarily disabled")
    if (!connecting) {
        connecting = (async () => {
            const c = createClient({
                url: env.REDIS_URL,
                socket: { reconnectStrategy: (retries) => (retries > 5 ? new Error("giving up") : Math.min(retries * 200, 2000)) },
            }) as RedisClientType
            c.on("error", (err) => console.error("Redis query-cache client error:", err.message))
            await c.connect()
            client = c
        })().catch((err) => {
            disabledUntil = Date.now() + DISABLE_MS
            connecting = null
            throw err
        })
    }
    await connecting
}

/**
 * Returns the cached value for `key`, or runs `compute()` and caches its result for `ttlSeconds`.
 *
 * `compute` runs exactly as it would without a cache when Redis is unavailable, so a caller never
 * has to handle a cache-specific failure mode.
 */
export const cached = async <T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> => {
    try {
        await connect()
        const hit = await client!.get(key)
        if (hit !== null) return JSON.parse(hit) as T
    } catch {
        return compute()
    }

    const value = await compute()
    try {
        // Errors here are ignored on purpose: the value is already correct, it just won't be
        // cached. Failing the request because we couldn't *store* a result would be absurd.
        await client!.set(key, JSON.stringify(value), { EX: ttlSeconds })
    } catch {
        // Intentionally empty — see above.
    }
    return value
}

/**
 * Drops every key under `prefix`. Call after a mutation that makes cached reads wrong.
 *
 * Uses SCAN rather than KEYS — KEYS blocks the whole Redis server while it walks the keyspace,
 * which on a shared instance means blocking rate limiting and socket pub/sub too.
 */
export const invalidate = async (prefix: string) => {
    try {
        await connect()
        for await (const key of client!.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
            await client!.del(key)
        }
    } catch {
        // A failed invalidation means stale reads until the TTL expires, which is why every cached
        // entry has one. Still not worth failing the mutation that just succeeded.
    }
}

/** Namespaced so `invalidate('lookup:stores')` can't accidentally match another module's keys. */
export const cacheKey = (...parts: (string | number | undefined)[]) =>
    parts.filter((p) => p !== undefined && p !== "").join(":")
