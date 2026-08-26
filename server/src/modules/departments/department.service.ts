import { db } from "../../config/db.js";
import { departments } from "../../db/schema/core.js";
import { eq, asc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AppError } from "../../utils/AppError.js";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "./department.validation.js";

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
            const [rows, totalRows] = await Promise.all([
                db.select().from(departments).orderBy(asc(departments.name)).offset((page - 1) * limit).limit(limit),
                db.select({ count: sql<number>`count(*)` }).from(departments),
            ]);
            const total = Number(totalRows[0]?.count ?? 0);
            return {
                data: rows,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total },
            };
        }

        const data = await db.select().from(departments).orderBy(asc(departments.name));
        return { data };
    },

    async getById(id: string) {
        return getByIdOrThrow(id);
    },

    async create(input: CreateDepartmentInput) {
        const [existing] = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, input.name)).limit(1);
        if (existing) throw AppError.conflict("Name already exits");

        const id = createId();
        await db.insert(departments).values({
            id,
            name: input.name,
            isActive: input.isActive,
            storeId: input.storeId ?? null,
        });

        return getByIdOrThrow(id);
    },

    async update(id: string, input: UpdateDepartmentInput) {
        await getByIdOrThrow(id);

        await db.update(departments)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(departments.id, id));

        return getByIdOrThrow(id);
    },

    async remove(id: string) {
        const department = await getByIdOrThrow(id);
        await db.delete(departments).where(eq(departments.id, id));
        return department;
    },

    // Free-text -> Department resolution for the AI task-creation pipeline. Mirrors the client's
    // findDepartmentByName (SmartTaskModal.tsx), which has no server-side equivalent today.
    async resolveByName(name: string) {
        const clean = name.replace(/\b(department|dept|team)\b/gi, "").trim().toLowerCase();
        if (!clean) return null;
        const active = await db.select().from(departments).where(eq(departments.isActive, true));
        return active.find((d) => d.name.toLowerCase().includes(clean)) ?? null;
    }
};
