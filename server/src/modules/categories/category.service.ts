import { db } from "../../config/db.js";
import { categories, categoryAssignees, departments, users } from "../../db/schema/core.js";
import { eq, asc, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AppError } from "../../utils/AppError.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validation.js";

// NOTE: the conventions doc suggests Drizzle's relational query API (`db.query.x.findMany({
// with: ... })`) for populate-style reads. That generates LATERAL-join SQL which this
// environment's actual database (MariaDB 10.11, not real MySQL) rejects with a syntax error
// (`ER_PARSE_ERROR` near the lateral derived table) — confirmed by hand against the local DB.
// So every populate-equivalent read below uses a manual leftJoin/inArray query instead (the
// doc's explicitly-sanctioned fallback: "or a manual join").

type CategoryRow = typeof categories.$inferSelect;

// Replaces Mongoose's `.populate("departmentId", "name").populate("assigneeIds", "firstName
// lastName email")`. `departmentId`/`assigneeIds` stay as plain ids (still needed as-is for
// edit forms / write round-trips); `department` and `assignees` carry the populated data for
// display.
const attachRelations = async (rows: CategoryRow[]) => {
    if (rows.length === 0) return [];

    const departmentIds = [...new Set(rows.map((r) => r.departmentId))];
    const departmentRows = departmentIds.length
        ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, departmentIds))
        : [];
    const departmentById = new Map(departmentRows.map((d) => [d.id, d]));

    const categoryIds = rows.map((r) => r.id);
    const assigneeRows = await db.select({
        categoryId: categoryAssignees.categoryId,
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
    })
        .from(categoryAssignees)
        .innerJoin(users, eq(categoryAssignees.userId, users.id))
        .where(inArray(categoryAssignees.categoryId, categoryIds));

    const assigneesByCategory = new Map<string, typeof assigneeRows>();
    for (const row of assigneeRows) {
        const { categoryId, ...user } = row;
        const list = assigneesByCategory.get(categoryId) ?? [];
        list.push(row);
        assigneesByCategory.set(categoryId, list);
    }

    return rows.map((row) => {
        const assignees = (assigneesByCategory.get(row.id) ?? []).map(({ categoryId, ...user }) => user);
        return {
            ...row,
            department: departmentById.get(row.departmentId) ?? null,
            assigneeIds: assignees.map((u) => u.id),
            assignees,
        };
    });
};

const getByIdOrThrow = async (id: string) => {
    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!category) throw AppError.notFound("Category not found");
    const [mapped] = await attachRelations([category]);
    return mapped;
};

export const categoryService = {
    async list() {
        const rows = await db.select().from(categories).orderBy(asc(categories.name));
        return attachRelations(rows);
    },

    async getById(id: string) {
        return getByIdOrThrow(id);
    },

    async create(input: CreateCategoryInput) {
        const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, input.name)).limit(1);
        if (existing) throw AppError.conflict("Name is already exists");

        const id = createId();
        // Wrapped in a transaction (source had none) — the category row and its assignee
        // junction rows must succeed or fail together, per the conventions doc's transaction
        // guidance for multi-table writes that weren't atomic in the original Mongoose code.
        await db.transaction(async (tx) => {
            await tx.insert(categories).values({
                id,
                name: input.name,
                departmentId: input.departmentId,
                tatHours: input.tatHours ?? null,
                isActive: input.isActive ?? true,
            });

            if (input.assigneeIds?.length) {
                const uniqueAssigneeIds = [...new Set(input.assigneeIds)];
                await tx.insert(categoryAssignees).values(
                    uniqueAssigneeIds.map((userId) => ({ categoryId: id, userId })),
                );
            }
        });

        return getByIdOrThrow(id);
    },

    async update(id: string, input: UpdateCategoryInput) {
        const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1);
        if (!existing) throw AppError.notFound("Category not found");

        const { assigneeIds, ...rest } = input;

        // Wrapped in a transaction (source had none) — see create() above.
        await db.transaction(async (tx) => {
            await tx.update(categories).set({ ...rest, updatedAt: new Date() }).where(eq(categories.id, id));

            // Many-to-many replace-the-whole-array: delete-all-and-reinsert is the simplest safe
            // approach here (no other table's FK points at CategoryAssignee rows) — only touch
            // the junction table when assigneeIds was actually part of this update.
            if (assigneeIds !== undefined) {
                await tx.delete(categoryAssignees).where(eq(categoryAssignees.categoryId, id));
                if (assigneeIds.length) {
                    const uniqueAssigneeIds = [...new Set(assigneeIds)];
                    await tx.insert(categoryAssignees).values(
                        uniqueAssigneeIds.map((userId) => ({ categoryId: id, userId })),
                    );
                }
            }
        });

        return getByIdOrThrow(id);
    },

    async remove(id: string) {
        const category = await getByIdOrThrow(id);
        // CategoryAssignee.categoryId has onDelete: 'cascade', so junction rows are removed
        // automatically along with the category row.
        await db.delete(categories).where(eq(categories.id, id));
        return category;
    }
};
