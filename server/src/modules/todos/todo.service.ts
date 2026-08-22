import { db } from "../../config/db.js"
import { todos } from "../../db/schema/task.js"
import { eq, and, desc } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { AppError } from "../../utils/AppError.js"
import type { CreateTodoInput, UpdateTodoInput } from "./todo.validation.js"

export const todoService = {
    async listForUser(userId: string) {
        return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt))
    },

    async create(userId: string, input: CreateTodoInput) {
        // Todo.id is a client-generated cuid (see src/db/schema/task.js) — generate it up front
        // so we already know it after the insert, no re-select needed except to reflect defaults
        // (e.g. `priority` when not supplied) back to the caller.
        const id = createId();
        await db.insert(todos).values({
            id,
            userId,
            text: input.text,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
        });
        const [todo] = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
        return todo
    },

    // { id, userId } ownership filter stops one user from editing someone else's todo
    async update(id: string, userId: string, input: UpdateTodoInput) {
        const [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).limit(1);
        if (!existing) throw AppError.notFound('Todo not found')

        await db.update(todos).set({
            ...(input.text !== undefined ? { text: input.text } : {}),
            ...(input.completed !== undefined ? { completed: input.completed } : {}),
            ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            updatedAt: new Date(),
        }).where(eq(todos.id, id));

        const [todo] = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
        return todo
    },

    async remove(id: string, userId: string) {
        const [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, userId))).limit(1);
        if (!existing) throw AppError.notFound('Todo not found')
        await db.delete(todos).where(eq(todos.id, id));
    },
}
