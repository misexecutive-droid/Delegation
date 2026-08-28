import path from "node:path";
import fs from "node:fs";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../config/db.js";
import { tickets, ticketAttachments } from "../../db/schema/index.js";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../../utils/AppError.js";
import type { AccessTokenPayload } from "../../middleware/auth/auth.js";
import { assertCanMutate } from "../tickets/ticket.service.js";

export const ticketAttachmentService = {
    async upload(ticketId: string, files: Express.Multer.File[], user: AccessTokenPayload) {
        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
        if (!ticket) throw AppError.notFound("Ticket not found");
        assertCanMutate(user, ticket);

        if (!files.length) {
            throw AppError.badRequest("No valid image files were received (check file type and size)");
        }

        const rows = files.map((file) => ({
            id: createId(),
            url: `/uploads/ticket-attachments/${path.basename(file.path)}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            ticketId: ticket.id,
            uploadedBy: user.sub,
        }));
        await db.insert(ticketAttachments).values(rows);
        return db.select().from(ticketAttachments).where(inArray(ticketAttachments.id, rows.map((r) => r.id)));
    },

    async remove(attachmentId: string, user: AccessTokenPayload) {
        const [attachment] = await db.select().from(ticketAttachments).where(eq(ticketAttachments.id, attachmentId)).limit(1);
        if (!attachment) throw AppError.notFound("Attachment not found");

        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, attachment.ticketId)).limit(1);
        if (ticket) assertCanMutate(user, ticket);
        if (!ticket && user.role !== "ADMIN" && user.role !== "PC" && attachment.uploadedBy !== user.sub) {
            throw AppError.forbidden("You don't have access to this ticket's attachments");
        }

        const absolutePath = path.resolve(process.cwd(), "uploads", "ticket-attachments", path.basename(attachment.url));
        fs.unlink(absolutePath, (err) => {
            if (err) console.error("Failed to delete attachment file from disk:", err);
        });

        await db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId));
        return attachment;
    },
};
