import { z } from 'zod';

// A TS type can declare a field "always an array" and still be wrong at runtime — the server has
// sent several ticket/task/checklist responses missing fields their own type claims are required
// (additionalAssigneeIds, checklists, comments, attachments all did this and crashed a render
// somewhere downstream). `.catch([])` on a permissive item schema means "whatever this field is,
// if it isn't a usable array, treat it as an empty one" instead of trusting the type assertion
// `apiFetch<T>(...)` makes at every call site.
export const arrayField = <T extends z.ZodTypeAny>(item: T) => z.array(item).catch([]);

// `.passthrough()` means every field NOT listed here is left exactly as the server sent it,
// untyped and unvalidated — this only closes the specific "missing array" crash class, it is not
// a full response schema and isn't meant to become one field-by-field.
export const withArrayDefaults = <Shape extends z.ZodRawShape>(shape: Shape) => z.object(shape).passthrough();

// Applies a partial array-defaults schema to a raw API object and returns it re-typed as T — the
// schema only touches the fields it declares, so casting the result back to the full T is safe.
export const normalizeWith = <T>(schema: z.ZodTypeAny, raw: unknown): T => schema.parse(raw) as T;
