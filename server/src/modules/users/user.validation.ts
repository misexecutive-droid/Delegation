import { z } from "zod"
import { ROLES } from "../../db/schema/core.js"
import { objectId } from "../../utils/index.js"

export const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    role: z.enum(ROLES),
    departmentId: objectId.optional(),
    storeId: objectId.optional(),
});

// Password changes aren't handled through this update endpoint (see user.service.ts's
// UpdateUserInput comment) — same reason it's left out of update here, only create needs it.
// departmentId/storeId are overridden to also accept `null` (unlike create) so an admin can
// explicitly clear a user's department/store, not just set a new one — mirrors
// ticket.validation.ts's assigneeId.
export const updateUserSchema = createUserSchema.omit({ password: true, departmentId: true, storeId: true }).partial().extend({
    isActive: z.boolean().optional(),
    departmentId: objectId.nullable().optional(),
    storeId: objectId.nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Admin-initiated password reset (not the self-service email-token flow in auth.service.ts) —
// an ADMIN/PC sets a user's password directly, e.g. when someone's locked out.
export const resetUserPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Both optional (unlike ticket.validation.ts's paginatioinSchema): the admin directory list page
// passes page+limit to get a paginated slice, but every other caller of GET /users (OrgStructure's
// tree, assignable-user pickers relying on the full roster, etc.) calls it with neither and must
// keep getting the complete unpaginated array back, unchanged.
export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});
