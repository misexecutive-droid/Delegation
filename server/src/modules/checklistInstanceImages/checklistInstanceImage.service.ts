import path from "node:path";
import fs from "node:fs";
import { db } from "../../config/db.js";
import { checklistInstanceItems, checklistInstances, checklistInstanceImages, checklistInstanceAssignees } from "../../db/schema/index.js";
import { eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AppError } from "../../utils/AppError.js";
import type { AccessTokenPayload } from "../../middleware/auth/auth.js";

// A recurring checklist instance has no per-item assignee (see ChecklistDefinitionItem.ts) — so
// unlike the Ticket/Task side, "can upload" is checked against the whole instance's assigneeIds,
// not a single item.assigneeId. assigneeIds is now the checklistInstanceAssignees junction table
// rather than a real embedded array field.
const assertCanUpload = async (user: AccessTokenPayload, item: { instanceId: string }) => {
    if (user.role === "ADMIN" || user.role === "PC") return;
    const [instance] = await db.select().from(checklistInstances).where(eq(checklistInstances.id, item.instanceId)).limit(1);
    if (!instance) throw AppError.notFound("Checklist instance not found");
    const assigneeLinks = await db.select({ userId: checklistInstanceAssignees.userId })
        .from(checklistInstanceAssignees)
        .where(eq(checklistInstanceAssignees.instanceId, instance.id));
    if (assigneeLinks.some((l) => l.userId === user.sub)) return;
    throw AppError.forbidden("Only an assignee of this checklist can upload evidence for it");
};

export const checklistInstanceImageService = {
    async upload(itemId: string, files: Express.Multer.File[], captureMethod: "LIVE" | "GALLERY", user: AccessTokenPayload) {
        const [item] = await db.select().from(checklistInstanceItems).where(eq(checklistInstanceItems.id, itemId)).limit(1);
        if (!item) throw AppError.notFound("Checklist item not found");
        await assertCanUpload(user, item);

        if (!files.length) {
            throw AppError.badRequest("No valid image files were received (check file type and size)");
        }

        if (item.requiresLivePhoto && captureMethod !== "LIVE") {
            files.forEach((f) => fs.unlink(f.path, () => {}));
            throw AppError.badRequest("This item requires a live camera photo, not a gallery upload");
        }

        if (item.maxImageCount != null) {
            const existing = await db.select({ id: checklistInstanceImages.id })
                .from(checklistInstanceImages)
                .where(eq(checklistInstanceImages.checklistInstanceItemId, item.id));
            const existingCount = existing.length;
            if (existingCount + files.length > item.maxImageCount) {
                files.forEach((f) => fs.unlink(f.path, () => {}));
                const remaining = Math.max(item.maxImageCount - existingCount, 0);
                throw AppError.badRequest(
                    remaining > 0
                        ? `This item allows at most ${item.maxImageCount} photo(s) — only ${remaining} more can be uploaded`
                        : `This item already has the maximum of ${item.maxImageCount} photo(s)`,
                );
            }
        }

        const rows = files.map((file) => ({
            id: createId(),
            url: `/uploads/checklist-instances/${path.basename(file.path)}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            captureMethod,
            checklistInstanceItemId: item.id,
            uploadedBy: user.sub,
        }));
        await db.insert(checklistInstanceImages).values(rows);
        // ids were generated client-side above, so we already know every field except the
        // DB-computed createdAt/updatedAt defaults — one re-select by those known ids gets us
        // the full rows (including those timestamps) without guessing at them.
        return db.select().from(checklistInstanceImages).where(inArray(checklistInstanceImages.id, rows.map((r) => r.id)));
    },

    async remove(imageId: string, user: AccessTokenPayload) {
        const [image] = await db.select().from(checklistInstanceImages).where(eq(checklistInstanceImages.id, imageId)).limit(1);
        if (!image) throw AppError.notFound("Image not found");

        const [item] = await db.select().from(checklistInstanceItems).where(eq(checklistInstanceItems.id, image.checklistInstanceItemId)).limit(1);
        if (item) await assertCanUpload(user, item);

        const absolutePath = path.resolve(process.cwd(), "uploads", "checklist-instances", path.basename(image.url));
        fs.unlink(absolutePath, (err) => {
            if (err) console.error("Failed to delete image file from disk:", err);
        });

        await db.delete(checklistInstanceImages).where(eq(checklistInstanceImages.id, imageId));
        return image;
    },
};
