import { db } from "../../config/db.js"
import { settings } from "../../db/schema/core.js"
import { eq } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import type { UpdateSettingsInput } from "./settings.validation.js"

// In-memory cache of the single Settings row. Anything that needs settings synchronously
// (e.g. building a multer instance per upload request, see config/upload.ts) reads this cache
// instead of hitting the database on every request. Refreshed on init() and every update().
let cache: typeof settings.$inferSelect | null = null;

// Settings is a "single row" config table with no natural unique business key, so there's no
// column to target a MySQL upsert (`onDuplicateKeyUpdate`) against. Simplest correct approach:
// try to select the one row, and if the table is empty, insert a single default row (with a
// client-generated cuid id, per convention) and re-select it.
const loadOrCreate = async () => {
    const [existing] = await db.select().from(settings).limit(1);
    if (existing) return existing;

    const id = createId();
    await db.insert(settings).values({ id });
    const [created] = await db.select().from(settings).where(eq(settings.id, id)).limit(1);
    return created!;
};

export const settingsService = {
    // Called once at server startup (see server.ts) so the cache is populated before the app
    // starts accepting requests — everything downstream assumes getCached() always has a value.
    async init() {
        cache = await loadOrCreate();
        return cache;
    },

    // Synchronous read of whatever's currently cached. Used by code that can't await a DB call
    // mid-request, like upload.ts building multer's limits object fresh on every upload.
    getCached() {
        if (!cache) throw new Error("Settings accessed before settingsService.init() ran");
        return cache;
    },

    async get() {
        if (!cache) await this.init();
        return cache;
    },

    // NOTE (bug fix): the old Mongoose Settings model had a typo, `maxUploadFiltes`, so updates
    // sent as `maxUploadFiles` (the name the Zod schema here — and the React client — always
    // used) matched no schema path and were silently dropped by Mongoose. The Drizzle `settings`
    // table below is spelled correctly (`maxUploadFiles`), so this update now actually persists
    // that field — a real, previously-live bug fix, not just a straight port.
    async update(input: UpdateSettingsInput) {
        if (!cache) await this.init();
        const id = cache!.id;
        await db.update(settings).set({ ...input, updatedAt: new Date() }).where(eq(settings.id, id));
        const [updated] = await db.select().from(settings).where(eq(settings.id, id)).limit(1);
        cache = updated!;
        return cache;
    },
};
