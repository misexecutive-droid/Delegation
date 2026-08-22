export const FIELD_LABEL_CLASS =
  'text-sm font-semibold text-text-secondary normal-case tracking-normal leading-none flex items-center gap-1.5 select-none mb-1.5 transition-colors duration-200 ease-in-out';

export const FIELD_LABEL_ICON_CLASS =
  'w-3.5 h-3.5 shrink-0 text-text-light group-focus-within/field:text-primary-500 transition-colors duration-200 ease-in-out';

// Groups each form field into its own rounded, subtly-shaded "card" — same border/bg tokens the
// rest of the app already uses for cards (see TaskCard, MonthlyTargetCard), just applied here so
// a mobile-width form reads as a stack of distinct fields instead of a flat list of bare inputs.
export const FIELD_CARD_CLASS =
  'rounded-2xl border border-border/60 bg-surface-hover/40 p-4 transition-colors duration-200 focus-within:border-primary-400/50';