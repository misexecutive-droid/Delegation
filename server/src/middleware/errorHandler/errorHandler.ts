import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../utils/AppError.js';
import { env } from '../../config/env.js';

// mysql2 errors are plain objects with a `code`/`errno` (not a class hierarchy like Mongoose's
// driver errors), so we type-guard on shape instead of `instanceof`.
type MySqlError = { code?: string; errno?: number; sqlMessage?: string };
const isMySqlError = (err: unknown): err is MySqlError =>
  typeof err === 'object' && err !== null && ('code' in err || 'errno' in err);

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {

  // If a response was already sent — e.g. a webhook handler that acks immediately with
  // res.sendStatus(200) before doing async work, then hits an error in that later work — there's
  // nothing left to send here. Calling res.status()/.json() again would throw "Cannot set headers
  // after they are sent", so just log and stop.
  if (res.headersSent) {
    console.error(err);
    return;
  }

  // A. CUSTOM OPERATIONAL ERRORS
  // Check if the error is an instance of our trusted custom error class (e.g., 401 Unauthorized, 404 Not Found)
  if (err instanceof AppError) {
    // Return the specific status code and custom message configured when the error was thrown
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // B. ZOD REQUEST VALIDATION ERRORS
  // Check if the incoming request payload failed a Zod schema validation parse check
  if (err instanceof ZodError) {
    // Return a 400 Bad Request along with clean, mapped key-value errors via .flatten().fieldErrors
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.flatten().fieldErrors });
  }

  // C. MYSQL DUPLICATE KEY ERRORS
  // mysql2 reports a unique-constraint violation as code 'ER_DUP_ENTRY' (errno 1062) — the
  // relational equivalent of MongoDB's error code 11000. Same response shape as before, minus
  // Mongo's structured `keyValue` (mysql2 only gives a formatted message naming the key).
  if (isMySqlError(err) && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate value', detail: err.sqlMessage });
  }

  // D. OTHER MYSQL CONSTRAINT ERRORS (e.g. a required FK row was missing/deleted concurrently)
  if (isMySqlError(err) && err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist' });
  }

  // E. UNHANDLED INTERNAL SYSTEM ERRORS (FALLBACK)
  // Safely log the unhandled system error (like a database connection failure or syntax crash) to the server console
  console.error(err);

  // Send a generic 500 status to the client, dynamically hiding or exposing the stack trace/message based on production environments
  return res.status(500).json({
    success: false,
    // Security Guard: Mask descriptive system errors in production to avoid leaking database architectures or paths to users
    message: env.NODE_ENV === 'production' ? 'Internal server error' : String((err as Error)?.message ?? err),
  });
};
