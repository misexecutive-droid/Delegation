/**
 * Maintenance mode, whole-app and per-page.
 *
 * `VITE_MAINTENANCE_MODE=true` takes the entire app down (the pre-existing behaviour, kept as-is).
 * `VITE_MAINTENANCE_PAGES` takes down individual pages instead, so a single module can be put
 * behind a maintenance notice while it's being updated without blocking everything else:
 *
 *   VITE_MAINTENANCE_PAGES=/tasks,/checklists
 *
 * Both are Vite env vars, so they're read at build time — flipping one needs a rebuild/redeploy,
 * not just a server restart. That's a deliberate trade: it keeps the check free at runtime and
 * needs no backend endpoint. If you later want to toggle it live, this module is the one place to
 * swap the source for a server-driven flag.
 */

const parsePages = (raw: string): string[] =>
  raw
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    // Normalise "tasks" and "/tasks/" both to "/tasks" so the env var is forgiving about slashes.
    .map((path) => `/${path.replace(/^\/+|\/+$/g, '')}`);

export const MAINTENANCE_ALL = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

export const MAINTENANCE_PAGES = parsePages(import.meta.env.VITE_MAINTENANCE_PAGES ?? '');

/**
 * Matches the page and everything under it — `/tasks` also covers `/tasks/team`, since a module
 * being rebuilt usually means its detail routes are mid-change too. `/` is special-cased to match
 * the dashboard exactly, or it would swallow every route in the app.
 */
export const isPathUnderMaintenance = (pathname: string): boolean =>
  MAINTENANCE_PAGES.some((page) => (page === '/' ? pathname === '/' : pathname === page || pathname.startsWith(`${page}/`)));

/** Human-readable page name for the notice, derived from the path when we have nothing better. */
export const maintenancePageLabel = (pathname: string): string => {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'This page';
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
