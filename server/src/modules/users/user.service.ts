import { db } from "../../config/db.js";
import { users } from "../../db/schema/core.js";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { hashPassword, deriveDefaultRank } from "../../utils/password.js";
import { AccessTokenPayload } from "../../middleware/auth/auth.js";
import type { CreateUserInput, UpdateUserInput } from "./user.validation.js";

// An assertion function narrowing `T | undefined` (a plain row is now `undefined` when missing,
// not Mongoose's `null`) to `T`, throwing AppError.notFound otherwise.
function assertFound<T>(entity: T | undefined, message: string = 'User not found'): asserts entity is T {
    if (!entity) throw AppError.notFound(message);
}

// Explicit column list that NEVER includes passwordHash — every read in this service goes
// through this, per the conventions doc's warning that `db.select()` with no column list
// would otherwise leak the bcrypt hash to API responses.
const publicUserColumns = {
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    departmentId: users.departmentId,
    storeId: users.storeId,
    isActive: users.isActive,
    rank: users.rank,
    phone: users.phone,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
};

const getSafeById = async (id: string) => {
    const [user] = await db.select(publicUserColumns).from(users).where(eq(users.id, id)).limit(1);
    return user;
};

export const userService = {
    async list() {
        return db.select(publicUserColumns).from(users).orderBy(desc(users.createdAt));
    },

    async getById(id: string) {
        const user = await getSafeById(id);
        assertFound(user);
        return user;
    },

    async create(input: CreateUserInput, actorId: string) {
        // Mongoose's schema-level `lowercase: true, trim: true` on email ran automatically on
        // save — replicate that normalization explicitly here (same as auth.service.ts register).
        const email = input.email.trim().toLowerCase();
        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing) throw AppError.conflict('Email already registered');

        const passwordHash = await hashPassword(input.password);
        const rank = deriveDefaultRank(input.role);
        const id = createId();

        await db.insert(users).values({
            id,
            email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            departmentId: input.departmentId ?? null,
            storeId: input.storeId ?? null,
            rank,
        });

        // Re-select (through the passwordHash-free column list) rather than constructing the
        // return value by hand, so `createdAt`/`updatedAt` DB defaults are reflected accurately.
        const user = await getSafeById(id);
        assertFound(user);

        await auditService.record({
            entityType: "User",
            entityId: user.id,
            action: "CREATE",
            actorId,
            after: { email: user.email, role: user.role, isActive: user.isActive }
        });

        return user;
    },

    async update(id: string, input: UpdateUserInput, actorId: string) {
        const before = await getSafeById(id);
        assertFound(before);

        // Password changes aren't handled through this endpoint (see user.validation.ts), so
        // there's no passwordHash to touch here — just the plain profile/admin-management fields.
        const { email, ...rest } = input;
        await db.update(users)
            .set({
                ...rest,
                ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
                updatedAt: new Date(),
            })
            .where(eq(users.id, id));

        const user = await getSafeById(id);
        assertFound(user);

        await auditService.record({
            entityType: "User",
            entityId: id,
            action: "UPDATE",
            actorId,
            before: { email: before.email, role: before.role, isActive: before.isActive },
            after: { email: user.email, role: user.role, isActive: user.isActive }
        });

        return user;
    },

    async remove(id: string, actorId: string) {
        const user = await getSafeById(id);
        assertFound(user);

        await db.delete(users).where(eq(users.id, id));

        await auditService.record({
            entityType: "User",
            entityId: id,
            action: "DELETE",
            actorId,
            before: { email: user.email, role: user.role }
        });

        return user;
    },

    async listAssignable(user: AccessTokenPayload, departmentId?: string, storeId?: string) {
        const isManager = user.role === "MANAGER";
        const effectiveDepartmentId = isManager && departmentId !== user.departmentId ? undefined : departmentId;
        const effectiveStoreId = isManager && storeId !== user.storeId ? undefined : storeId;

        const conditions = [eq(users.isActive, true)];
        if (effectiveDepartmentId) conditions.push(eq(users.departmentId, effectiveDepartmentId));
        if (effectiveStoreId) conditions.push(eq(users.storeId, effectiveStoreId));

        if (isManager && !effectiveDepartmentId && !effectiveStoreId) {
            const orConditions = [eq(users.id, user.sub)];
            if (user.departmentId) orConditions.push(eq(users.departmentId, user.departmentId));
            if (user.storeId) orConditions.push(eq(users.storeId, user.storeId));
            conditions.push(or(...orConditions)!);
        }

        return db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
            departmentId: users.departmentId,
        })
            .from(users)
            .where(and(...conditions))
            .orderBy(asc(users.firstName));
    }
};
