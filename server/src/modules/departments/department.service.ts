import { db } from "../../config/db.js";
import { departments } from "../../db/schema/core.js";
import { eq, asc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AppError } from "../../utils/AppError.js";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "./department.validation.js";
import { auditService } from "../audit/audit.service.js";
import { cached, invalidate, cacheKey } from "../../config/queryCache.js";

// Departments feed every dropdown, filter bar and the org tree, and change a handful of times
// a year — so a long TTL with explicit invalidation on write, rather than a short guess.
const CACHE_PREFIX = "lookup:Department";
const CACHE_TTL_SECONDS = 300;
const dropCache = () => invalidate(CACHE_PREFIX);

const getByIdOrThrow = async (id: string) => {
    const [department] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!department) throw AppError.notFound("Department not found");
    return department;
};

export const departmentService = {
    // page/limit are optional — pass both for a paginated slice (the admin directory list), omit
    // both for the full list unchanged (dropdowns, org structure, etc.).
    async list(page?: number, limit?: number) {
        if (page && limit) {
            const [rows, totalRows] = await cached(cacheKey(CACHE_PREFIX, "page", page, limit), CACHE_TTL_SECONDS, () => Promise.all([
                db.select().from(departments).orderBy(asc(departments.name)).offset((page - 1) * limit).limit(limit),
                db.select({ count: sql<number>`count(*)` }).from(departments),
            ]));
            const total = Number(totalRows[0]?.count ?? 0);
            return {
                data: rows,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total },
            };
        }

        const data = await cached(cacheKey(CACHE_PREFIX, "all"), CACHE_TTL_SECONDS, () =>
            db.select().from(departments).orderBy(asc(departments.name)));
        return { data };
    },

    async getById(id: string) {
        return getByIdOrThrow(id);
    },

    async create(input: CreateDepartmentInput, actorId: string) {
        const [existing] = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, input.name)).limit(1);
        if (existing) throw AppError.conflict("Name already exits");

        const id = createId();
        await db.insert(departments).values({
            id,
            name: input.name,
            isActive: input.isActive,
            storeId: input.storeId ?? null,
        });

        const created = await getByIdOrThrow(id);
        await auditService.record({ entityType: "Department", entityId: id, action: "CREATE", actorId, after: created });
        await dropCache();
        return created;
    },

    async update(id: string, input: UpdateDepartmentInput, actorId: string) {
        const before = await getByIdOrThrow(id);

        await db.update(departments)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(departments.id, id));

        const after = await getByIdOrThrow(id);
        await auditService.record({ entityType: "Department", entityId: id, action: "UPDATE", actorId, before, after });
        await dropCache();
        return after;
    },

    async remove(id: string, actorId: string) {
        const department = await getByIdOrThrow(id);
        await db.delete(departments).where(eq(departments.id, id));
        await auditService.record({ entityType: "Department", entityId: id, action: "DELETE", actorId, before: department });
        await dropCache();
        return department;
    },

    // Free-text -> Department resolution for the AI task-creation pipeline. Mirrors the client's
    // findDepartmentByName (SmartTaskModal.tsx), which has no server-side equivalent today.
    async resolveByName(name: string) {
        const clean = name.replace(/\b(department|dept|team)\b/gi, "").trim().toLowerCase();
        if (!clean) return null;
        const active = await db.select().from(departments).where(eq(departments.isActive, true));

        // Prefer an exact (case-insensitive) match over a substring match — otherwise "IT" could
        // resolve to whichever of "IT" / "IT Support" happens to come first in query order, and a
        // message meant for one department silently routes to the other.
        const exact = active.find((d) => d.name.toLowerCase() === clean);
        if (exact) return exact;

        // Among ambiguous substring matches, prefer the shortest department name — the tightest
        // match to what was actually extracted, instead of picking by array/insertion order.
        const substringMatches = active.filter((d) => d.name.toLowerCase().includes(clean));
        if (substringMatches.length === 0) return null;
        return substringMatches.reduce((best, d) => (d.name.length < best.name.length ? d : best));
    }
};
