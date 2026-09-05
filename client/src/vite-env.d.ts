/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** `true` takes the whole app down — see lib/maintenance.ts. */
  readonly VITE_MAINTENANCE_MODE?: string;
  /** Comma-separated page paths to take down individually, e.g. `/tasks,/checklists`. */
  readonly VITE_MAINTENANCE_PAGES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
