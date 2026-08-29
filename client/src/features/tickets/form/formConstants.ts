export const LABEL_CLASS = 'text-xs font-display font-medium text-text-secondary flex items-center gap-1.5';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Same outline-chip colors as PRIORITY_CONFIG in ticketDisplay.ts (the source of truth for every
// other ticket priority badge) — built from theme tokens only, no raw blue/amber/orange/rose.
// CRITICAL shares HIGH's danger color but adds bold weight to stay visually distinct once selected.
export const PRIORITIES: { value: TicketPriority; label: string; outlineClass: string; selectedClass: string }[] = [
  { value: 'LOW', label: 'Low', outlineClass: 'border-border text-text-secondary', selectedClass: 'bg-surface-hover border-border-hover text-text' },
  { value: 'MEDIUM', label: 'Medium', outlineClass: 'border-warning/60 text-warning', selectedClass: 'bg-warning/10 border-warning text-warning' },
  { value: 'HIGH', label: 'High', outlineClass: 'border-danger/60 text-danger', selectedClass: 'bg-danger/10 border-danger text-danger' },
  { value: 'CRITICAL', label: 'Critical', outlineClass: 'border-danger/60 text-danger font-bold', selectedClass: 'bg-danger/10 border-danger text-danger font-bold' },
];
