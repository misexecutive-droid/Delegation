import { db } from "../../config/db.js"
import { tasks, taskAdditionalAssignees, taskAttachments, taskChecklists, taskChecklistItems, taskImages } from "../../db/schema/index.js"
import { users } from "../../db/schema/core.js"
import { eq, and, or, inArray, desc, sql } from "drizzle-orm"
import { DATE_FORMATS } from "../../utils/dateBucket.js"
import { createId } from "@paralleldrive/cuid2"
import { AppError } from "../../utils/AppError.js"
import { assertChecklistsResolved } from "../../utils/checklistGate.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"
import type { ConfirmSmartTaskInput, CreateTaskInput, UpdateTaskInput, VerifyTaskInput } from "./task.validation.js"
import { notificationService } from "../notifications/notification.service.js"
import { emitTaskEvent } from "../../sockets/taskEvent.js"
import type { DateBucket } from "../../utils/index.js"

// NOTE on populate-heavy reads: the conventions doc recommends Drizzle's relational query API
// (`db.query.tasks.findFirst({ with: {...} })`) for these, but that API compiles every "many"
// relation into a `LEFT JOIN LATERAL (...)` subquery regardless of nesting depth — and the actual
// database this app runs against (MariaDB 10.11) does not support the LATERAL join syntax at all
// (confirmed against the real local instance; even a single-level `with` fails with a SQL syntax
// error). So every populate below is done as plain `db.select()` calls (regular, non-lateral
// joins/`inArray` batch queries) with the nesting assembled by hand in JS instead.

// A drizzle `or(...)` clause that matches the "self and department" visibility rule: task
// creator, primary assignee, or additional assignee (the latter requires a join against the
// junction table, so this returns the plain condition and the caller decides whether the
// additional-assignee join is actually needed for a given query).
const selfAndDepartmentCondition = (user: AccessTokenPayload) =>
    or(eq(tasks.userId, user.sub), eq(tasks.assigneeId, user.sub));

// Fetches the set of task ids where `userId` appears as an additional assignee — used to widen
// a visibility/mutation filter the same way the old Mongoose `additionalAssigneeIds: user.sub`
// array-contains filter did.
const additionalAssigneeTaskIds = async (userId: string): Promise<string[]> => {
    const rows = await db.select({ taskId: taskAdditionalAssignees.taskId })
        .from(taskAdditionalAssignees)
        .where(eq(taskAdditionalAssignees.userId, userId));
    return rows.map((r) => r.taskId);
};

// ADMIN and PC both get full org-wide visibility — PC's whole job is verification, so capping
// them to their own department made most of the org invisible to them and left the "filter by
// department/person" view (AdminTaskList) unusable for anyone but an admin. Safe to broaden here:
// PC is still blocked from create/delete at the route level (task.routes.ts) and from raw status
// updates in update() below, so this only actually widens list/getById/verify.
// Same-department/creator/assignee visibility everyone below ADMIN/PC gets by default.
const buildVisibilityCondition = async (user: AccessTokenPayload) => {
    if (user.role === "ADMIN" || user.role === "PC") return undefined;

    const additionalIds = await additionalAssigneeTaskIds(user.sub);
    const selfCondition = additionalIds.length
        ? or(selfAndDepartmentCondition(user), inArray(tasks.id, additionalIds))
        : selfAndDepartmentCondition(user);

    // MANAGER is this app's "department head" role — they get everything within their own
    // department (not just tasks they created or were assigned), on top of the same
    // creator/assignee visibility everyone else gets for tasks outside their department. This is
    // read-only reach: update() below deliberately does NOT use this function for that reason —
    // see buildMutationCondition.
    if (user.role === "MANAGER" && user.departmentId) {
        return or(eq(tasks.departmentId, user.departmentId), selfCondition);
    }

    return selfCondition;
};

// update()'s authorization check — deliberately narrower than buildVisibilityCondition. ADMIN/PC
// still get unrestricted edit rights (PC is separately blocked from calling update() at all, just
// below), but MANAGER's department-wide *visibility* must not silently double as department-wide
// *edit* rights — being able to see a colleague's delegation is not the same as being allowed to
// retitle it, reassign it, or move its due date. Everyone else keeps the same creator/assignee
// scope they always had.
const buildMutationCondition = async (user: AccessTokenPayload) => {
    if (user.role === "ADMIN" || user.role === "PC") return undefined;

    const additionalIds = await additionalAssigneeTaskIds(user.sub);
    return additionalIds.length
        ? or(selfAndDepartmentCondition(user), inArray(tasks.id, additionalIds))
        : selfAndDepartmentCondition(user);
};

// Replaces the whole additionalAssigneeIds set for a task with `userIds` inside a transaction —
// same delete-all-and-reinsert pattern as the rest of this migration (no other table's foreign
// key points at these junction rows, so it's safe).
const replaceAdditionalAssignees = async (taskId: string, userIds: string[] | undefined) => {
    if (userIds === undefined) return;
    // wrapped in a transaction (source had none)
    await db.transaction(async (tx) => {
        await tx.delete(taskAdditionalAssignees).where(eq(taskAdditionalAssignees.taskId, taskId));
        if (userIds.length) {
            await tx.insert(taskAdditionalAssignees).values(userIds.map((userId) => ({ taskId, userId })));
        }
    });
};

export const taskService = {
    async list(user: AccessTokenPayload, filterUserId?: string, status?: string, page = 1, limit = 200) {
        let condition;
        if ((user.role === "ADMIN" || user.role === "PC") && filterUserId) {
            const additionalIds = await additionalAssigneeTaskIds(filterUserId);
            condition = additionalIds.length
                ? or(eq(tasks.userId, filterUserId), eq(tasks.assigneeId, filterUserId), inArray(tasks.id, additionalIds))
                : or(eq(tasks.userId, filterUserId), eq(tasks.assigneeId, filterUserId));
        } else {
            condition = await buildVisibilityCondition(user);
        }

        const where = status
            ? (condition ? and(condition, eq(tasks.status, status as any)) : eq(tasks.status, status as any))
            : condition;

        const rows = await db.select().from(tasks)
            .where(where)
            .orderBy(desc(tasks.createdAt))
            .offset((page - 1) * limit)
            .limit(limit);
        if (!rows.length) return [];

        // Old code only needed `url`/`mimeType` for the attachment thumbnails.
        const taskIds = rows.map((t) => t.id);
        const attachmentRows = await db.select({ taskId: taskAttachments.taskId, url: taskAttachments.url, mimeType: taskAttachments.mimeType })
            .from(taskAttachments)
            .where(inArray(taskAttachments.taskId, taskIds));
        const attachmentsByTask = new Map<string, { url: string; mimeType: string }[]>();
        for (const a of attachmentRows) {
            const list = attachmentsByTask.get(a.taskId) ?? [];
            list.push({ url: a.url, mimeType: a.mimeType });
            attachmentsByTask.set(a.taskId, list);
        }

        return rows.map((task) => ({ ...task, attachments: attachmentsByTask.get(task.id) ?? [] }));
    },

    async createFromSmartInput(input: ConfirmSmartTaskInput, user: AccessTokenPayload) {
        const id = createId();
        await db.insert(tasks).values({
            id,
            title: input.title,
            description: input.context || null,
            category: input.category === "delegated_task" ? "delegation" : "issue",
            priority: input.priority,
            dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
            userId: user.sub,
            assigneeId: input.assigneeId ?? null,
            departmentId: input.departmentId ?? null,
            aiMeta: {
                rawInput: input.rawInput,
                inputMode: input.inputMode,
                channel: input.channel,
                extractedAssigneeName: input.assigneeRaw || null,
                extractedDepartment: input.departmentRaw || null,
                confidence: input.confidence ?? null,
                model: input.wonBy ?? null,
            },
        });

        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

        emitTaskEvent('task:created', {
            userId: task!.userId,
            assigneeId: task!.assigneeId ?? null,
            departmentId: task!.departmentId ?? null,
        }, task);

        return task!;
    },

    async getById(id: string, user: AccessTokenPayload) {
        const visibility = await buildVisibilityCondition(user);
        const where = visibility ? and(eq(tasks.id, id), visibility) : eq(tasks.id, id);

        const [task] = await db.select().from(tasks).where(where).limit(1);
        if (!task) throw AppError.notFound("Delegation not found")

        // checklists -> items -> images (see the NOTE above imports for why this is assembled by
        // hand instead of via db.query's relational API).
        const checklistRows = await db.select().from(taskChecklists).where(eq(taskChecklists.taskId, task.id));
        const checklistIds = checklistRows.map((c) => c.id);
        const itemRows = checklistIds.length
            ? await db.select().from(taskChecklistItems).where(inArray(taskChecklistItems.taskChecklistId, checklistIds))
            : [];
        const itemIds = itemRows.map((i) => i.id);
        const imageRows = itemIds.length
            ? await db.select().from(taskImages).where(inArray(taskImages.taskChecklistItemId, itemIds))
            : [];

        const imagesByItem = new Map<string, typeof imageRows>();
        for (const img of imageRows) {
            const list = imagesByItem.get(img.taskChecklistItemId) ?? [];
            list.push(img);
            imagesByItem.set(img.taskChecklistItemId, list);
        }
        const itemsByChecklist = new Map<string, (typeof itemRows[number] & { images: typeof imageRows })[]>();
        for (const item of itemRows) {
            const list = itemsByChecklist.get(item.taskChecklistId) ?? [];
            list.push({ ...item, images: imagesByItem.get(item.id) ?? [] });
            itemsByChecklist.set(item.taskChecklistId, list);
        }
        const checklists = checklistRows.map((c) => ({ ...c, items: itemsByChecklist.get(c.id) ?? [] }));

        // attachments -> uploadedByUser (a regular join is fine here — only "many" relations
        // needed the LATERAL join drizzle's relational API insists on).
        const attachmentRows = await db.select({
            attachment: taskAttachments,
            uploadedByUser: { id: users.id, email: users.email, firstName: users.firstName, role: users.role },
        })
            .from(taskAttachments)
            .leftJoin(users, eq(taskAttachments.uploadedBy, users.id))
            .where(eq(taskAttachments.taskId, task.id));
        const attachments = attachmentRows.map((r) => ({ ...r.attachment, uploadedByUser: r.uploadedByUser }));

        return { ...task, checklists, attachments };
    },

    async create(input: CreateTaskInput, user: AccessTokenPayload) {
        const { additionalAssigneeIds, startDate, dueDate, ...rest } = input;
        const id = createId();

        // wrapped in a transaction (source had none)
        const task = await db.transaction(async (tx) => {
            await tx.insert(tasks).values({
                id,
                ...rest,
                startDate: startDate ? new Date(startDate) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                userId: user.sub,
            });

            if (additionalAssigneeIds?.length) {
                await tx.insert(taskAdditionalAssignees).values(
                    additionalAssigneeIds.map((userId) => ({ taskId: id, userId })),
                );
            }

            const [created] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
            return created!;
        });

        return task;
    },

    async update(id: string, input: UpdateTaskInput, user: AccessTokenPayload) {
        if (user.role === "PC") {
            throw AppError.forbidden("PC can only act on a delegation through the verification queue.")
        }

        const mutationCondition = await buildMutationCondition(user);
        const where = mutationCondition ? and(eq(tasks.id, id), mutationCondition) : eq(tasks.id, id);

        const [existing] = await db.select().from(tasks).where(where).limit(1);
        if (!existing) throw AppError.notFound("Delegation not found");

        const beforeStatus = existing.status;

        if (input.status === "done" && beforeStatus !== "done") {
            if (user.role !== "ADMIN") {
                throw AppError.forbidden("Only a verifier can mark a delegation done — send it for review instead.")
            }
        } else if (input.status === "pending_verification" && beforeStatus !== "pending_verification") {
            const checklistRows = await db.select().from(taskChecklists).where(eq(taskChecklists.taskId, existing.id));
            const checklistIds = checklistRows.map((c) => c.id);
            const itemRows = checklistIds.length
                ? await db.select().from(taskChecklistItems).where(inArray(taskChecklistItems.taskChecklistId, checklistIds))
                : [];
            const itemsByChecklist = new Map<string, typeof itemRows>();
            for (const item of itemRows) {
                const list = itemsByChecklist.get(item.taskChecklistId) ?? [];
                list.push(item);
                itemsByChecklist.set(item.taskChecklistId, list);
            }
            const checklistsWithItems = checklistRows.map((c) => ({ ...c, items: itemsByChecklist.get(c.id) ?? [] }));
            assertChecklistsResolved(checklistsWithItems, "sending this delegation for review")
        }

        const { additionalAssigneeIds, startDate, dueDate, ...rest } = input;

        // Moving the deadline (or changing/clearing the reminder lead time) invalidates whatever
        // reminder was already scheduled for the old dueDate — re-arm it so the sweep can send a
        // fresh one instead of treating this task as already handled.
        const update: Record<string, unknown> = { ...rest, updatedAt: new Date() };
        if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
        if ("dueDate" in input || "reminderMinutesBefore" in input) {
            update.reminderSentAt = null;
        }

        // wrapped in a transaction (source had none)
        const task = await db.transaction(async (tx) => {
            await tx.update(tasks).set(update).where(and(eq(tasks.id, id), mutationCondition ?? eq(tasks.id, id)));
            await replaceAdditionalAssignees(id, additionalAssigneeIds);
            const [updated] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
            return updated;
        });
        if (!task) throw AppError.notFound("Delegation not found")

        if (input.status === "pending_verification" && beforeStatus !== "pending_verification") {
            await notificationService.notifyPendingVerification({
                _id: task.id,
                title: task.title,
                departmentId: task.departmentId ?? undefined,
            }, 'TASK');
        }

        return task;
    },


    async verify(id: string, input: VerifyTaskInput, user: AccessTokenPayload) {
        const visibility = await buildVisibilityCondition(user);
        const where = visibility ? and(eq(tasks.id, id), visibility) : eq(tasks.id, id);
        const [task] = await db.select().from(tasks).where(where).limit(1);
        if (!task) throw AppError.notFound("Delegation not found")

        if (task.status !== "pending_verification") {
            throw AppError.badRequest("This delegation isn't pending verification.")
        }

        const update: Record<string, unknown> = { updatedAt: new Date() };
        if (input.action === "APPROVE") {
            update.status = "done";
            update.verifiedBy = user.sub;
            update.verifiedAt = new Date();
            update.verificationNote = input.note ?? null;
        } else {
            update.status = "in_progress";
            update.verificationNote = input.note ?? null;
        }
        await db.update(tasks).set(update).where(eq(tasks.id, id));

        const [updated] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
        const additionalAssigneeIds = (await db.select({ userId: taskAdditionalAssignees.userId })
            .from(taskAdditionalAssignees)
            .where(eq(taskAdditionalAssignees.taskId, id))).map((r) => r.userId);

        await notificationService.notifyVerificationResult({
            _id: updated!.id,
            title: updated!.title,
            userId: updated!.userId,
            assigneeId: updated!.assigneeId ?? undefined,
            additionalAssigneeIds,
        }, input.action, input.note, 'TASK')

        return updated!;
    },


    async remove(id: string, user: AccessTokenPayload) {
        const visibility = await buildVisibilityCondition(user);
        const where = visibility ? and(eq(tasks.id, id), visibility) : eq(tasks.id, id);

        const [task] = await db.select().from(tasks).where(where).limit(1);
        if (!task) throw AppError.notFound("Delegation not found");

        // wrapped in a transaction (source had none) — clears junction/child rows that have no
        // cascading FK before deleting the task itself.
        await db.transaction(async (tx) => {
            await tx.delete(taskAdditionalAssignees).where(eq(taskAdditionalAssignees.taskId, id));
            await tx.delete(tasks).where(eq(tasks.id, id));
        });

        return task;
    },

    // Ported from a MongoDB aggregation pipeline (TaskChecklistItem -> TaskChecklist -> Task,
    // joined to TaskImage) to raw SQL, since the pipeline's conditional "qualifying photo count"
    // logic ($cond/$filter/$size) doesn't map onto Prisma-/Drizzle-style query builders cleanly.
    // Shape/semantics preserved exactly: per time bucket, how many checklist items were done, and
    // of those requiring a photo, how many met their photo-evidence requirement (LIVE-only if
    // requiresLivePhoto, otherwise any capture method).
    async complianceReport(groupBy: DateBucket, departmentId?: string, from?: string, to?: string, userId?: string, departmentIds?: string[]) {
        const conditions: ReturnType<typeof sql>[] = [];
        if (from) conditions.push(sql`tci.createdAt >= ${new Date(from)}`);
        if (to) conditions.push(sql`tci.createdAt <= ${new Date(to)}`);
        if (departmentId) conditions.push(sql`t.departmentId = ${departmentId}`);
        // A SENIOR has no department of their own — this matches every department that belongs
        // to their store instead (see reportScope.ts's resolveDepartmentIdsForStore). Checked
        // explicitly against `undefined` so an empty array (a store with zero departments
        // assigned yet) still matches nothing, rather than silently matching everything.
        if (departmentIds !== undefined) {
            conditions.push(departmentIds.length
                ? sql`t.departmentId IN (${sql.join(departmentIds.map((id) => sql`${id}`), sql`, `)})`
                : sql`1 = 0`);
        }
        if (userId) conditions.push(sql`(t.userId = ${userId} OR t.assigneeId = ${userId} OR taa.userId IS NOT NULL)`);

        const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

        // db.execute() on the mysql2 driver resolves to the raw mysql2 result tuple
        // [rows, fields], NOT a plain row array — must destructure element 0.
        const [rows] = await db.execute(sql`
            SELECT
                DATE_FORMAT(tci.createdAt, ${DATE_FORMATS[groupBy]}) AS bucket,
                COUNT(*) AS totalItems,
                SUM(tci.isDone) AS doneItems,
                SUM(tci.requiredImageCount > 0) AS itemsRequiringPhotos,
                SUM(
                    CASE WHEN tci.requiredImageCount > 0
                        AND (CASE WHEN tci.requiresLivePhoto THEN COALESCE(img.liveCount, 0) ELSE COALESCE(img.totalCount, 0) END) >= tci.requiredImageCount
                    THEN 1 ELSE 0 END
                ) AS photoCompliantItems
            FROM TaskChecklistItem tci
            JOIN TaskChecklist tc ON tc.id = tci.taskChecklistId
            JOIN Task t ON t.id = tc.taskId
            LEFT JOIN (
                SELECT taskChecklistItemId, COUNT(*) AS totalCount, SUM(captureMethod = 'LIVE') AS liveCount
                FROM TaskImage GROUP BY taskChecklistItemId
            ) img ON img.taskChecklistItemId = tci.id
            LEFT JOIN TaskAdditionalAssignee taa ON taa.taskId = t.id AND taa.userId = ${userId ?? null}
            ${whereClause}
            GROUP BY bucket
            ORDER BY bucket ASC
        `);

        return (rows as unknown as any[]).map((r) => ({
            bucket: r.bucket as string,
            totalItems: Number(r.totalItems),
            doneItems: Number(r.doneItems),
            completionRate: Number(r.totalItems) ? Math.round((Number(r.doneItems) / Number(r.totalItems)) * 1000) / 10 : null,
            itemsRequiringPhotos: Number(r.itemsRequiringPhotos),
            qualityRate: Number(r.itemsRequiringPhotos) ? Math.round((Number(r.photoCompliantItems) / Number(r.itemsRequiringPhotos)) * 1000) / 10 : null,
        }));
    },

};
