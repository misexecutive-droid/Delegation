// Replaces two things that used to live on the Mongoose User model:
//   1. the `password` virtual setter + pre('validate') hook that bcrypt-hashed it, and
//   2. the pre('validate') hook that defaulted `rank` from `role` when null.
// Drizzle has no document-level hooks, so every call site that used to do
// `user.password = plain; await user.save()` now calls `hashPassword(plain)` explicitly
// before inserting/updating, and every user-create path calls `deriveDefaultRank(role, rank)`.
import bcrypt from "bcryptjs";
import { DEFAULT_RANK_BY_ROLE, type Role } from "../db/schema/core.js";

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 12);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const deriveDefaultRank = (role: Role, rank?: number | null): number =>
  rank ?? DEFAULT_RANK_BY_ROLE[role] ?? DEFAULT_RANK_BY_ROLE.USER;
