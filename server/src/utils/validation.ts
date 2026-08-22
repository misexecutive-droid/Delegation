import { z } from "zod"

// Every primary/foreign key in the MySQL schema is a cuid2 string (see src/db/schema),
// not a MongoDB ObjectId anymore — kept the export name `objectId` unchanged so the ~30
// modules that already `import { objectId } from "../../utils"` don't need touching.
// cuid2 ids are lowercase alphanumeric, 24 characters by default; validate loosely
// (length only) rather than hard-coding the exact alphabet, in case the id length/charset
// is ever tuned later.
export const objectId = z.string().min(1).max(191, "Invalid id")
