import { db } from "../../config/db.js";
import { auditLogs, users } from "../../db/schema/core.js";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// The audit service is the "write it down" part of our compliance trail.
// Whenever something important happens (a Ticket is created/updated/deleted, a User's role changes, etc.)
// other parts of the app call auditService.record(...) to save a snapshot of what changed and who did it.
// This is valuable because later, if something looks wrong, an admin can look at the audit log and see
// exactly who changed a record, when, and what the data looked like before and after - accountability + debugging.
export const auditService = {
    // Records one audit log entry describing a single change to a single entity.
    async record( params : {
        entityType : string; // e.g. "Ticket", "User" - what kind of thing changed
        entityId : string; // the id of the specific record that changed
        action : string; // e.g. "CREATE", "UPDATE", "DELETE" - what kind of change happened
        actorId : string; // the id of the user who made the change (for accountability - "who did this?")
        before?:unknown; // a snapshot of the data before the change (optional, e.g. not applicable on CREATE)
        after?:unknown; // a snapshot of the data after the change (optional, e.g. not applicable on DELETE)
    }){
        try{
            // AuditLog.id is a client-generated cuid (see src/db/schema/core.ts) — generate it
            // up front, matching the convention used everywhere else in the migration.
            // save a new AuditLog row with all the details of this change
            await db.insert(auditLogs).values({
                id: createId(),
                entityType : params.entityType,
                entityId : params.entityId,
                action : params.action,
                actorId : params.actorId,
                before : params.before ?? null, // if no "before" was given, store null instead of undefined
                after : params.after ?? null, // if no "after" was given, store null instead of undefined
            });
        }catch(err){
            // We deliberately swallow (catch) the error here instead of throwing it.
            // Why? Writing an audit log is a side effect - if it fails, we don't want it to block or
            // crash the main action (e.g. creating a ticket) just because logging failed.
            // We still log the error to the console so a developer can notice it.
            console.error("Failed to write audit log", err)
        }
    },

    // Fetches the full audit history for one entity, newest first - e.g. "show me everything that ever happened to Ticket #123"
    async listForEntity(entityType : string , entityId : string){
        // AuditLog.actorId is intentionally NOT a foreign key to User (see src/db/schema/core.ts
        // — actor identity here can't be joined to Users directly, e.g. system actors), so there's
        // no relations() entry to use with the relational query API's `with`. A plain LEFT JOIN
        // reproduces the old `.populate({ path: "actorId", select: "email firstName role" })`
        // behavior instead — `actor` comes back null for any actorId that doesn't match a real user.
        return db
            .select({
                id: auditLogs.id,
                entityType: auditLogs.entityType,
                entityId: auditLogs.entityId,
                action: auditLogs.action,
                actorId: auditLogs.actorId,
                before: auditLogs.before,
                after: auditLogs.after,
                createdAt: auditLogs.createdAt,
                updatedAt: auditLogs.updatedAt,
                actor: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    role: users.role,
                },
            })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.actorId, users.id))
            .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
            .orderBy(desc(auditLogs.createdAt));
    },
}
