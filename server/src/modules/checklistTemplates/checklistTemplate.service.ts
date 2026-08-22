import { createId } from "@paralleldrive/cuid2"
import { db } from "../../config/db.js"
import { checklistTemplates, checklistTemplateItems } from "../../db/schema/index.js"
import { eq, asc, inArray } from "drizzle-orm"
import { AppError } from "../../utils/AppError.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"
import type {
    CreateChecklistTemplateInput,
    UpdateChecklistTemplateInput,
    CreateChecklistTemplateItemInput,
    UpdateChecklistTemplateItemInput,
} from "./checklistTemplate.validation.js"

// Not using Drizzle's relational query API (`db.query...with:{...}`) here — that API compiles
// every relation into a `LEFT JOIN LATERAL (...)` subquery, and the actual database this app
// runs against (MariaDB 10.11) doesn't support LATERAL joins at all (confirmed against the real
// local instance). Plain selects assembled by hand in JS instead — same pattern as
// task.service.ts/ticket.service.ts.
const getTemplateWithItems = async (id: string) => {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1)
    if (!template) return undefined
    const items = await db.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, id)).orderBy(asc(checklistTemplateItems.order))
    return { ...template, items }
}

export const checklistTemplateService = {
    async list(appliesTo?: "TASK" | "TICKET") {
        const templateRows = await db
            .select()
            .from(checklistTemplates)
            .where(appliesTo ? eq(checklistTemplates.appliesTo, appliesTo) : undefined)
            .orderBy(asc(checklistTemplates.name))
        const templateIds = templateRows.map((t) => t.id)
        const itemRows = templateIds.length
            ? await db.select().from(checklistTemplateItems).where(inArray(checklistTemplateItems.templateId, templateIds)).orderBy(asc(checklistTemplateItems.order))
            : []
        const itemsByTemplate = new Map<string, typeof itemRows>()
        for (const item of itemRows) {
            const list = itemsByTemplate.get(item.templateId) ?? []
            list.push(item)
            itemsByTemplate.set(item.templateId, list)
        }
        return templateRows.map((t) => ({ ...t, items: itemsByTemplate.get(t.id) ?? [] }))
    },

    async getById(id: string) {
        const template = await getTemplateWithItems(id)
        if (!template) throw AppError.notFound("Checklist template not found")
        return template
    },

    async create(input: CreateChecklistTemplateInput, user: AccessTokenPayload) {
        const id = createId()
        await db.insert(checklistTemplates).values({
            id,
            name: input.name,
            appliesTo: input.appliesTo,
            departmentId: input.departmentId ?? null,
            createdBy: user.sub,
        })

        if (input.items?.length) {
            await db.insert(checklistTemplateItems).values(
                input.items.map((item, index) => ({
                    id: createId(),
                    label: item.label,
                    order: item.order ?? index,
                    requiredImageCount: item.requiredImageCount ?? 0,
                    maxImageCount: item.maxImageCount ?? null,
                    requiresLivePhoto: item.requiresLivePhoto ?? false,
                    defaultAssigneeId: item.defaultAssigneeId ?? null,
                    templateId: id,
                })),
            )
        }

        return getTemplateWithItems(id)
    },

    async update(id: string, input: UpdateChecklistTemplateInput) {
        const [existing] = await db.select({ id: checklistTemplates.id }).from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1)
        if (!existing) throw AppError.notFound("Checklist template not found")

        const patch: Partial<typeof checklistTemplates.$inferInsert> = { updatedAt: new Date() }
        if (input.name !== undefined) patch.name = input.name
        if (input.departmentId !== undefined) patch.departmentId = input.departmentId

        await db.update(checklistTemplates).set(patch).where(eq(checklistTemplates.id, id))
        const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1)
        return template
    },

    async remove(id: string) {
        const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1)
        if (!template) throw AppError.notFound("Checklist template not found")
        // wrapped in a transaction (source had none)
        await db.transaction(async (tx) => {
            await tx.delete(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, id))
            await tx.delete(checklistTemplates).where(eq(checklistTemplates.id, id))
        })
        return template
    },

    async addItem(templateId: string, input: CreateChecklistTemplateItemInput) {
        const [template] = await db.select({ id: checklistTemplates.id }).from(checklistTemplates).where(eq(checklistTemplates.id, templateId)).limit(1)
        if (!template) throw AppError.notFound("Checklist template not found")
        const id = createId()
        await db.insert(checklistTemplateItems).values({
            id,
            label: input.label,
            order: input.order ?? 0,
            requiredImageCount: input.requiredImageCount ?? 0,
            maxImageCount: input.maxImageCount ?? null,
            requiresLivePhoto: input.requiresLivePhoto ?? false,
            defaultAssigneeId: input.defaultAssigneeId ?? null,
            templateId,
        })
        const [item] = await db.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.id, id)).limit(1)
        return item
    },

    async updateItem(itemId: string, input: UpdateChecklistTemplateItemInput) {
        const [existing] = await db.select({ id: checklistTemplateItems.id }).from(checklistTemplateItems).where(eq(checklistTemplateItems.id, itemId)).limit(1)
        if (!existing) throw AppError.notFound("Checklist template item not found")

        const patch: Partial<typeof checklistTemplateItems.$inferInsert> = { updatedAt: new Date() }
        if (input.label !== undefined) patch.label = input.label
        if (input.order !== undefined) patch.order = input.order
        if (input.requiredImageCount !== undefined) patch.requiredImageCount = input.requiredImageCount
        if (input.maxImageCount !== undefined) patch.maxImageCount = input.maxImageCount
        if (input.requiresLivePhoto !== undefined) patch.requiresLivePhoto = input.requiresLivePhoto
        if (input.defaultAssigneeId !== undefined) patch.defaultAssigneeId = input.defaultAssigneeId

        await db.update(checklistTemplateItems).set(patch).where(eq(checklistTemplateItems.id, itemId))
        const [item] = await db.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.id, itemId)).limit(1)
        return item
    },

    async removeItem(itemId: string) {
        const [item] = await db.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.id, itemId)).limit(1)
        if (!item) throw AppError.notFound("Checklist template item not found")
        await db.delete(checklistTemplateItems).where(eq(checklistTemplateItems.id, itemId))
        return item
    },
}
