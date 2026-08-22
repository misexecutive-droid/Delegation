import path from "node:path"
import fs from "node:fs"
import { db } from "../../config/db.js"
import { taskChecklistItems, taskImages } from "../../db/schema/index.js"
import { eq, count, inArray } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { AppError } from "../../utils/AppError.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"

// Same rule as completing an item — only the assignee (or an admin) can add evidence photos.
const assertCanUpload = (user: AccessTokenPayload, item: { assigneeId: string | null }) => {
    if (user.role === "ADMIN" || user.role === "PC") return;
    if (item.assigneeId && item.assigneeId === user.sub) return;
    throw AppError.forbidden("Only the assigned person can upload evidence for this item");
};

export const taskImageService = {
    async upload(itemId: string, files: Express.Multer.File[], captureMethod: "LIVE" | "GALLERY", user: AccessTokenPayload) {
        const [item] = await db.select().from(taskChecklistItems).where(eq(taskChecklistItems.id, itemId)).limit(1);
        if (!item) throw AppError.notFound("Checklist item not found");
        assertCanUpload(user, item);

        if (!files.length) {
            // Multer's fileFilter (config/upload.ts) silently drops non-image files instead of
            // erroring — this is where that shows up: if everything got filtered out, files
            // will be empty even though the request technically "succeeded" at the multer layer.
            throw AppError.badRequest("No valid image files were received (check file type and size)");
        }

        // If this item mandates a live photo, reject a gallery upload outright instead of
        // silently storing files that would never count toward completion anyway (see
        // taskChecklist.service.ts's completeItem, which filters these out at completion time).
        if (item.requiresLivePhoto && captureMethod !== "LIVE") {
            // Clean up what multer already wrote to disk before we knew to reject it — otherwise
            // these become orphaned files nothing ever references or deletes.
            files.forEach((f) => fs.unlink(f.path, () => {}));
            throw AppError.badRequest("This item requires a live camera photo, not a gallery upload");
        }

        // maxImageCount: an upper cap on how much evidence can pile up on one item — distinct
        // from requiredImageCount (the minimum needed to complete it). null means no cap.
        if (item.maxImageCount != null) {
            const [{ existingCount }] = await db.select({ existingCount: count() })
                .from(taskImages)
                .where(eq(taskImages.taskChecklistItemId, item.id));
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
            url: `/uploads/tasks/${path.basename(file.path)}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            captureMethod,
            taskChecklistItemId: item.id,
            uploadedBy: user.sub,
        }));

        await db.insert(taskImages).values(rows);

        // We already know every inserted id (client-generated cuids — see conventions doc), so a
        // targeted re-select by those exact ids is enough; no need to re-derive them from a
        // broader query against the item.
        return db.select().from(taskImages).where(inArray(taskImages.id, rows.map((r) => r.id)));
    },

    async remove(imageId: string, user: AccessTokenPayload) {
        const [image] = await db.select().from(taskImages).where(eq(taskImages.id, imageId)).limit(1);
        if (!image) throw AppError.notFound("Image not found");

        const [item] = await db.select().from(taskChecklistItems).where(eq(taskChecklistItems.id, image.taskChecklistItemId)).limit(1);
        if (item) assertCanUpload(user, item);

        // Delete the real file from disk. If this fails (e.g. it was already gone), we log it
        // but still proceed to clean up the database record — a stray file on disk is a much
        // smaller problem than a database record permanently pointing at nothing.
        const absolutePath = path.resolve(process.cwd(), "uploads", "tasks", path.basename(image.url));
        fs.unlink(absolutePath, (err) => {
            if (err) console.error("Failed to delete image file from disk:", err);
        });

        await db.delete(taskImages).where(eq(taskImages.id, imageId));
        return image;
    },
};
