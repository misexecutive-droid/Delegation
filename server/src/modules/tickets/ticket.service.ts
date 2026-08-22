import path from "node:path"
import { createId } from "@paralleldrive/cuid2"
import { db } from "../../config/db.js"
import {
  tickets,
  ticketStatusUpdates,
  ticketAttachments,
  ticketComments,
  checklists,
  checklistItems,
  checklistImages,
  users,
} from "../../db/schema/index.js"
import { eq, and, or, inArray, desc, asc, sql } from "drizzle-orm"
import { AppError } from "../../utils/AppError.js"
import { assertChecklistsResolved } from "../../utils/checklistGate.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"
import type { CreateTicketInput, UpdateTicketInput, VerifyTicketInput, StatusUpdateInput } from "./ticket.validation.js"
import { auditService } from "../audit/audit.service.js"
import { emitTicketEvent } from "../../sockets/ticketEvent.js"
import { DATE_FORMATS } from "../../utils/dateBucket.js"
import type { DateBucket } from "../../utils/index.js"
import { notificationService } from "../notifications/notification.service.js"
import { settingsService } from "../settings/settings.service.js"

type TicketRow = typeof tickets.$inferSelect

// Recomputes tatDueAt from tatHours (was a Mongoose pre('save') hook on Ticket — see
// src/models/Ticket.ts). Call this explicitly everywhere tatHours is set/changed, alongside
// resetting isOverdue back to false.
const deriveTatDueAt = (tatHours: number | null, fromDate: Date): Date | null =>
  tatHours ? new Date(fromDate.getTime() + tatHours * 60 * 60 * 1000) : null

// NOTE on populate-heavy reads: the conventions doc recommends Drizzle's relational query API
// (`db.query.tickets.findFirst({ with: {...} })`) for these, but that API compiles every
// relation (even a single "one" relation) into a `LEFT JOIN LATERAL (...)` subquery — and the
// actual database this app runs against (MariaDB 10.11) does not support the LATERAL join
// syntax at all (confirmed against the real local instance; even a single-level `with` fails
// with a SQL syntax error). So every populate below is done as plain `db.select()` calls
// (regular, non-lateral joins/`inArray` batch queries) with the nesting assembled by hand in JS
// instead — same pattern as task.service.ts/event.service.ts.

const userCols = { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, role: users.role } as const

const groupBy = <T, K>(rows: T[], keyFn: (row: T) => K): Map<K, T[]> => {
  const map = new Map<K, T[]>()
  for (const row of rows) {
    const key = keyFn(row)
    const list = map.get(key)
    if (list) list.push(row)
    else map.set(key, [row])
  }
  return map
}

// Batch-populates a set of already-fetched Ticket rows with everything the old
// `populateTicket` Mongoose populate chain used to attach: assignee/raisedBy/verifier,
// checklists -> items -> images, attachments -> uploadedByUser, comments -> author (sorted
// ascending), statusUpdates -> changedByUser + photos (sorted descending).
const populateTickets = async (ticketRows: TicketRow[]) => {
  if (!ticketRows.length) return []
  const ticketIds = ticketRows.map((t) => t.id)

  const userIds = [...new Set(ticketRows.flatMap((t) => [t.assigneeId, t.userId, t.verifiedBy]).filter((v): v is string => Boolean(v)))]
  const userRows = userIds.length ? await db.select(userCols).from(users).where(inArray(users.id, userIds)) : []
  const userById = new Map(userRows.map((u) => [u.id, u]))

  const checklistRows = await db.select().from(checklists).where(inArray(checklists.ticketId, ticketIds))
  const checklistIds = checklistRows.map((c) => c.id)
  const itemRows = checklistIds.length ? await db.select().from(checklistItems).where(inArray(checklistItems.checklistId, checklistIds)) : []
  const itemIds = itemRows.map((i) => i.id)
  const imageRows = itemIds.length ? await db.select().from(checklistImages).where(inArray(checklistImages.checklistItemId, itemIds)) : []

  const imagesByItem = groupBy(imageRows, (i) => i.checklistItemId)
  const itemsByChecklist = groupBy(itemRows.map((i) => ({ ...i, images: imagesByItem.get(i.id) ?? [] })), (i) => i.checklistId)
  const checklistsByTicket = groupBy(checklistRows.map((c) => ({ ...c, items: itemsByChecklist.get(c.id) ?? [] })), (c) => c.ticketId)

  const attachmentRows = await db
    .select({ attachment: ticketAttachments, uploadedByUser: userCols })
    .from(ticketAttachments)
    .leftJoin(users, eq(ticketAttachments.uploadedBy, users.id))
    .where(inArray(ticketAttachments.ticketId, ticketIds))
  const attachmentsByTicket = groupBy(
    attachmentRows.map((r) => ({ ...r.attachment, uploadedByUser: r.uploadedByUser })),
    (a) => a.ticketId,
  )

  const commentRows = await db
    .select({ comment: ticketComments, author: userCols })
    .from(ticketComments)
    .leftJoin(users, eq(ticketComments.authorId, users.id))
    .where(inArray(ticketComments.ticketId, ticketIds))
    .orderBy(asc(ticketComments.createdAt))
  const commentsByTicket = groupBy(commentRows.map((r) => ({ ...r.comment, author: r.author })), (c) => c.ticketId)

  const statusUpdateRows = await db
    .select({ statusUpdate: ticketStatusUpdates, changedByUser: userCols })
    .from(ticketStatusUpdates)
    .leftJoin(users, eq(ticketStatusUpdates.changedBy, users.id))
    .where(inArray(ticketStatusUpdates.ticketId, ticketIds))
    .orderBy(desc(ticketStatusUpdates.createdAt))
  const statusUpdateIds = statusUpdateRows.map((r) => r.statusUpdate.id)
  const photoRows = statusUpdateIds.length
    ? await db.select().from(ticketAttachments).where(inArray(ticketAttachments.statusUpdateId, statusUpdateIds))
    : []
  const photosByStatusUpdate = groupBy(photoRows, (p) => p.statusUpdateId as string)
  const statusUpdatesByTicket = groupBy(
    statusUpdateRows.map((r) => ({
      ...r.statusUpdate,
      changedByUser: r.changedByUser,
      photos: photosByStatusUpdate.get(r.statusUpdate.id) ?? [],
    })),
    (su) => su.ticketId,
  )

  return ticketRows.map((t) => ({
    ...t,
    assignee: t.assigneeId ? userById.get(t.assigneeId) ?? null : null,
    raisedBy: userById.get(t.userId) ?? null,
    verifier: t.verifiedBy ? userById.get(t.verifiedBy) ?? null : null,
    checklists: checklistsByTicket.get(t.id) ?? [],
    attachments: attachmentsByTicket.get(t.id) ?? [],
    comments: commentsByTicket.get(t.id) ?? [],
    statusUpdates: statusUpdatesByTicket.get(t.id) ?? [],
  }))
}

const getPopulatedTicket = async (id: string) => {
  const [row] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (!row) return undefined
  const [populated] = await populateTickets([row])
  return populated
}

// checklists -> items only, used by the IN_REVIEW checklist-completeness gate (no images/photos
// needed there — see assertChecklistsResolved).
const getTicketChecklistsWithItems = async (ticketId: string) => {
  const checklistRows = await db.select().from(checklists).where(eq(checklists.ticketId, ticketId))
  const checklistIds = checklistRows.map((c) => c.id)
  const itemRows = checklistIds.length ? await db.select().from(checklistItems).where(inArray(checklistItems.checklistId, checklistIds)) : []
  const itemsByChecklist = groupBy(itemRows, (i) => i.checklistId)
  return checklistRows.map((c) => ({ ...c, items: itemsByChecklist.get(c.id) ?? [] }))
}

const visibilityFilter = (user: AccessTokenPayload) => {
  // PC has the same org-wide access as ADMIN — same as tasks (see task.service.ts's own
  // visiblityFilter), so a PC user isn't blocked from other departments' tickets.
  if (user.role === "ADMIN" || user.role === "PC") return undefined

  if (user.role === "MANAGER") {
    const or_conditions = [eq(tickets.userId, user.sub)]
    if (user.departmentId) or_conditions.push(eq(tickets.departmentId, user.departmentId))
    if (user.storeId) or_conditions.push(eq(tickets.storeId, user.storeId))
    return or(...or_conditions)
  }

  // SENIOR is store-only (no department fallback) — an Area Head oversees exactly one store.
  if (user.role === "SENIOR") {
    return user.storeId ? eq(tickets.storeId, user.storeId) : eq(tickets.userId, user.sub)
  }

  if (user.role === "AGENT" || user.role === "USER") {
    const own = or(eq(tickets.assigneeId, user.sub), eq(tickets.userId, user.sub))!
    return user.departmentId ? and(own, eq(tickets.departmentId, user.departmentId)) : own
  }

  return eq(tickets.userId, user.sub)
}

const isSameDeptOrStore = (user: AccessTokenPayload, ticket: Pick<TicketRow, "departmentId" | "storeId">) => {
  const sameDept = Boolean(user.departmentId) && ticket.departmentId === user.departmentId
  const sameStore = Boolean(user.storeId) && ticket.storeId === user.storeId
  return sameDept || sameStore
}

const assertCanMutate = (user: AccessTokenPayload, ticket: Pick<TicketRow, "userId" | "assigneeId" | "departmentId" | "storeId">) => {
  if (user.role === "ADMIN" || user.role === "PC") return
  if (user.role === "AGENT" || user.role === "USER") {
    const ownTicket = ticket.assigneeId === user.sub || ticket.userId === user.sub
    const inOwnDept = !user.departmentId || ticket.departmentId === user.departmentId
    if (ownTicket && inOwnDept) return
    throw AppError.forbidden("Not your ticket")
  }

  if (user.role === "MANAGER") {
    if (isSameDeptOrStore(user, ticket)) return
    throw AppError.forbidden("Outside your department/store")
  }

  if (user.role === "SENIOR") {
    if (user.storeId && ticket.storeId === user.storeId) return
    throw AppError.forbidden("Outside your store")
  }

  throw AppError.forbidden()
};

// Shim passed to notificationService (still Mongoose-backed, migrated in a later pass) — its
// param types are `any`-typed fields, so a plain object using our string cuids works fine.
const notificationTarget = (ticket: Pick<TicketRow, "id" | "title" | "departmentId" | "storeId" | "userId" | "assigneeId">) => ({
  _id: ticket.id,
  title: ticket.title,
  departmentId: ticket.departmentId,
  storeId: ticket.storeId,
  userId: ticket.userId,
  assigneeId: ticket.assigneeId,
})

const roomTarget = (ticket: Pick<TicketRow, "userId" | "assigneeId" | "departmentId" | "storeId">) => ({
  userId: ticket.userId,
  assigneeId: ticket.assigneeId ?? null,
  departmentId: ticket.departmentId ?? null,
  storeId: ticket.storeId ?? null,
})

export const ticketService = {
  async list(user: AccessTokenPayload, page: number, limit: number, status?: string, assigneeId?: string) {
    const conditions = []
    const vis = visibilityFilter(user)
    if (vis) conditions.push(vis)
    if (status) conditions.push(eq(tickets.status, status as TicketRow["status"]))
    if (assigneeId && (user.role === "ADMIN" || user.role === "PC")) {
      conditions.push(or(eq(tickets.userId, assigneeId), eq(tickets.assigneeId, assigneeId))!)
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, totalRows] = await Promise.all([
      db.select().from(tickets).where(where).orderBy(desc(tickets.createdAt)).offset((page - 1) * limit).limit(limit),
      db.select({ count: sql<number>`count(*)` }).from(tickets).where(where),
    ])
    const data = await populateTickets(rows)
    const total = Number(totalRows[0]?.count ?? 0)
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total },
    }
  },

  async getById(id: string, user: AccessTokenPayload) {
    const ticket = await getPopulatedTicket(id)

    if (!ticket) throw AppError.notFound("Ticket not found");
    if (user.role !== "ADMIN" && user.role !== "PC") {
      const vis = visibilityFilter(user)
      const conditions = [eq(tickets.id, id)]
      if (vis) conditions.push(vis)
      const [visible] = await db.select({ id: tickets.id }).from(tickets).where(and(...conditions)).limit(1)

      if (!visible) throw AppError.forbidden();
    }
    return ticket;
  },

  async create(input: CreateTicketInput, user: AccessTokenPayload) {
    const tatHours = input.tatHours ?? settingsService.getCached().defaultTatHours
    const id = createId()
    const now = new Date()
    await db.insert(tickets).values({
      id,
      title: input.title,
      description: input.description,
      priority: input.priority,
      assignmentMode: input.assignmentMode,
      assigneeId: input.assigneeId ?? null,
      storeId: input.storeId ?? null,
      categoryId: input.categoryId ?? null,
      departmentId: input.departmentId ?? null,
      tatHours: tatHours ?? null,
      tatDueAt: deriveTatDueAt(tatHours ?? null, now),
      isOverdue: false,
      userId: user.sub,
    })

    const [afterRow] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)

    await auditService.record({
      entityType: "Ticket",
      entityId: id,
      action: "CREATE",
      actorId: user.sub,
      after: afterRow,
    })

    const populated = await getPopulatedTicket(id)
    emitTicketEvent("ticket:created", roomTarget(afterRow!), populated)

    if (afterRow!.assigneeId) {
      await notificationService.notifyTicketAssigned(notificationTarget(afterRow!))
    }

    return populated;
  },

  async update(id: string, input: UpdateTicketInput, user: AccessTokenPayload) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    if (!ticket) throw AppError.notFound("Ticket not found")
    assertCanMutate(user, ticket)

    const before = ticket;

    const patch: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() }
    if (input.title !== undefined) patch.title = input.title
    if (input.description !== undefined) patch.description = input.description
    if (input.priority !== undefined) patch.priority = input.priority
    if (input.assignmentMode !== undefined) patch.assignmentMode = input.assignmentMode
    if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId
    if (input.storeId !== undefined) patch.storeId = input.storeId
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId
    if (input.departmentId !== undefined) patch.departmentId = input.departmentId
    if (input.status !== undefined) patch.status = input.status

    if (input.status === "CLOSED" && before.status !== "CLOSED") {

      if (user.role !== "ADMIN" && user.role !== "PC") {
        throw AppError.forbidden("Only a verifier can close a ticket — send it for review instead.")
      }
      patch.closedAt = new Date();
    } else if (input.status === "IN_REVIEW" && before.status !== "IN_REVIEW") {
      // Fresh read with the exact `with` needed for the checklist gate, replacing the old
      // mid-flight `ticket.populate(...)` call on the already-fetched Mongoose document.
      const checklistsWithItems = await getTicketChecklistsWithItems(id)
      assertChecklistsResolved(checklistsWithItems, "sending this ticket for review")
    } else if (input.status && input.status !== "CLOSED" && before.status === "CLOSED") {
      patch.closedAt = null;
    }

    if (input.tatHours !== undefined && input.tatHours !== before.tatHours) {
      patch.tatHours = input.tatHours ?? null
      patch.tatDueAt = deriveTatDueAt(input.tatHours ?? null, new Date())
      patch.isOverdue = false
    }

    await db.update(tickets).set(patch).where(eq(tickets.id, id))

    const [afterRow] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)

    await auditService.record({
      entityType: "Ticket",
      entityId: id,
      action: "UPDATE",
      actorId: user.sub,
      before,
      after: afterRow,
    });

    const populated = await getPopulatedTicket(id)
    const target = roomTarget(afterRow!)

    emitTicketEvent("ticket:updated", target, populated);

    if (input.assigneeId && input.assigneeId !== before.assigneeId) {
      emitTicketEvent("ticket:assigned", target, populated)
      await notificationService.notifyTicketAssigned(notificationTarget(afterRow!));
    }

    if (input.status === "IN_REVIEW" && before.status !== "IN_REVIEW") {
      await notificationService.notifyPendingVerification(notificationTarget(afterRow!));
    }

    return populated;
  },

  async addStatusUpdate(id: string, input: StatusUpdateInput, files: Express.Multer.File[], user: AccessTokenPayload) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    if (!ticket) throw AppError.notFound("Ticket not found")
    assertCanMutate(user, ticket)

    const before = ticket;

    if (input.status === "IN_REVIEW" && before.status !== "IN_REVIEW") {
      const checklistsWithItems = await getTicketChecklistsWithItems(id)
      assertChecklistsResolved(checklistsWithItems, "sending this ticket for review")
    }

    const patch: Partial<typeof tickets.$inferInsert> = { status: input.status, updatedAt: new Date() }
    if (before.status === "CLOSED") {
      patch.closedAt = null;
    }

    const statusUpdateId = createId()
    await db.insert(ticketStatusUpdates).values({
      id: statusUpdateId,
      ticketId: id,
      changedBy: user.sub,
      fromStatus: before.status,
      toStatus: input.status,
      remark: input.remark,
    })

    if (files.length) {
      await db.insert(ticketAttachments).values(
        files.map((file) => ({
          id: createId(),
          url: `/uploads/ticket-attachments/${path.basename(file.path)}`,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          captureMethod: input.captureMethod ?? "GALLERY",
          statusUpdateId,
          ticketId: id,
          uploadedBy: user.sub,
        })),
      )
    }

    await db.update(tickets).set(patch).where(eq(tickets.id, id))

    const [afterRow] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)

    await auditService.record({
      entityType: "Ticket",
      entityId: id,
      action: "UPDATE",
      actorId: user.sub,
      before,
      after: afterRow,
    });

    const populated = await getPopulatedTicket(id)
    const target = roomTarget(afterRow!)
    emitTicketEvent("ticket:updated", target, populated);

    if (input.status === "IN_REVIEW" && before.status !== "IN_REVIEW") {
      await notificationService.notifyPendingVerification(notificationTarget(afterRow!));
    }

    if (input.status === "ON_HOLD" && before.status !== "ON_HOLD") {
      await notificationService.notifyTicketOnHold(notificationTarget(afterRow!), input.remark, user.sub);
    }

    return populated;
  },


  async verify(id: string, input: VerifyTicketInput, user: AccessTokenPayload) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    if (!ticket) throw AppError.notFound("Ticket not found")

    if (ticket.status !== "IN_REVIEW") {
      throw AppError.badRequest("This ticket isn't pending verification.")
    }

    const before = ticket;
    const patch: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() }

    if (input.action === "APPROVE") {
      patch.status = "CLOSED";
      patch.closedAt = new Date();
      patch.verifiedBy = user.sub;
      patch.verifiedAt = new Date();
      patch.verificationNote = input.note ?? null;
    } else {
      patch.status = "IN_PROGRESS";
      patch.verificationNote = input.note ?? null;
    }
    await db.update(tickets).set(patch).where(eq(tickets.id, id))

    const [afterRow] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)

    await auditService.record({
      entityType: "Ticket",
      entityId: id,
      action: "UPDATE",
      actorId: user.sub,
      before,
      after: afterRow,
    })

    const populated = await getPopulatedTicket(id)
    emitTicketEvent("ticket:updated", roomTarget(afterRow!), populated);
    await notificationService.notifyVerificationResult(notificationTarget(afterRow!), input.action, input.note)
    return populated;
  },

  async remove(id: string, user: AccessTokenPayload) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    if (!ticket) throw AppError.notFound("Ticket not found")

    // wrapped in a transaction (source had none) — the old Mongo `findByIdAndDelete` left every
    // child Checklist/ChecklistItem/ChecklistImage/TicketAttachment/TicketComment/
    // TicketStatusUpdate document orphaned with no referential integrity to stop it; MySQL's FK
    // constraints on those tables (`ON DELETE no action`) would otherwise reject deleting a
    // Ticket that still has children, so the cascade is now done explicitly here.
    await db.transaction(async (tx) => {
      const childChecklists = await tx.select({ id: checklists.id }).from(checklists).where(eq(checklists.ticketId, id))
      const checklistIds = childChecklists.map((c) => c.id)
      if (checklistIds.length) {
        const childItems = await tx.select({ id: checklistItems.id }).from(checklistItems).where(inArray(checklistItems.checklistId, checklistIds))
        const itemIds = childItems.map((i) => i.id)
        if (itemIds.length) {
          await tx.delete(checklistImages).where(inArray(checklistImages.checklistItemId, itemIds))
        }
        await tx.delete(checklistItems).where(inArray(checklistItems.checklistId, checklistIds))
        await tx.delete(checklists).where(eq(checklists.ticketId, id))
      }
      await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, id))
      await tx.delete(ticketComments).where(eq(ticketComments.ticketId, id))
      await tx.delete(ticketStatusUpdates).where(eq(ticketStatusUpdates.ticketId, id))
      await tx.delete(tickets).where(eq(tickets.id, id))
    })

    await auditService.record({
      entityType: "Ticket",
      entityId: id,
      action: "DELETE",
      actorId: user.sub,
      before: ticket,
    })
    return ticket;
  },

  // Original Mongo version used a single $facet aggregation (closed-tickets branch +
  // created-tickets branch computed in one round-trip). Ported here as two plain
  // queries merged in JS — MySQL has no $facet equivalent, and two queries against
  // indexed columns is simpler and just as fast as emulating it in one statement.
  async tatReport(groupBy: DateBucket, from?: string, to?: string, departmentId?: string, storeId?: string) {
    const closedConditions: ReturnType<typeof sql>[] = [sql`tickets.closedAt IS NOT NULL`];
    if (from) closedConditions.push(sql`tickets.closedAt >= ${new Date(from)}`);
    if (to) closedConditions.push(sql`tickets.closedAt <= ${new Date(to)}`);
    if (departmentId) closedConditions.push(sql`tickets.departmentId = ${departmentId}`);
    if (storeId) closedConditions.push(sql`tickets.storeId = ${storeId}`);

    const createdConditions: ReturnType<typeof sql>[] = [];
    if (from) createdConditions.push(sql`tickets.createdAt >= ${new Date(from)}`);
    if (to) createdConditions.push(sql`tickets.createdAt <= ${new Date(to)}`);
    if (departmentId) createdConditions.push(sql`tickets.departmentId = ${departmentId}`);
    if (storeId) createdConditions.push(sql`tickets.storeId = ${storeId}`);

    const closedWhere = sql`WHERE ${sql.join(closedConditions, sql` AND `)}`;
    const createdWhere = createdConditions.length ? sql`WHERE ${sql.join(createdConditions, sql` AND `)}` : sql``;

    // db.execute() on the mysql2 driver resolves to the raw mysql2 tuple [rows, fields],
    // NOT a plain row array — must destructure element 0 (see task.service.ts#complianceReport).
    const [closedRows] = await db.execute(sql`
      SELECT
        DATE_FORMAT(tickets.closedAt, ${DATE_FORMATS[groupBy]}) AS bucket,
        COUNT(*) AS closedCount,
        AVG(TIMESTAMPDIFF(SECOND, tickets.createdAt, tickets.closedAt) / 3600) AS avgTatHours,
        SUM(tickets.isOverdue) AS overdueCount
      FROM Ticket tickets
      ${closedWhere}
      GROUP BY bucket
    `);

    const [createdRows] = await db.execute(sql`
      SELECT
        DATE_FORMAT(tickets.createdAt, ${DATE_FORMATS[groupBy]}) AS bucket,
        COUNT(*) AS createdCount
      FROM Ticket tickets
      ${createdWhere}
      GROUP BY bucket
    `);

    const closedByBucket = new Map<string, { closedCount: number; avgTatHours: number | null; overdueCount: number }>(
      (closedRows as unknown as any[]).map((r) => [r.bucket as string, {
        closedCount: Number(r.closedCount),
        avgTatHours: r.avgTatHours != null ? Number(r.avgTatHours) : null,
        overdueCount: Number(r.overdueCount),
      }])
    );
    const createdByBucket = new Map<string, number>(
      (createdRows as unknown as any[]).map((r) => [r.bucket as string, Number(r.createdCount)])
    );

    const buckets = [...new Set([...closedByBucket.keys(), ...createdByBucket.keys()])].sort();

    return buckets.map((bucket) => {
      const closed = closedByBucket.get(bucket);
      const createdCount = createdByBucket.get(bucket) ?? 0;
      const closedCount = closed?.closedCount ?? 0;
      return {
        bucket,
        createdCount,
        closedCount,
        avgTatHours: closed?.avgTatHours != null ? Math.round(closed.avgTatHours * 10) / 10 : null,
        overdueCount: closed?.overdueCount ?? 0,
        completionRate: createdCount ? Math.round((closedCount / createdCount) * 1000) / 10 : null,
      };
    });
  }
}
