export const FIELD_LABEL_CLASS =
  'text-sm font-semibold text-text-secondary normal-case tracking-normal leading-none flex items-center gap-1.5 select-none mb-1.5 transition-colors duration-200 ease-in-out';

export const FIELD_LABEL_ICON_CLASS =
  'w-3.5 h-3.5 shrink-0 text-text-light group-focus-within/field:text-primary-500 transition-colors duration-200 ease-in-out';

// Was a bordered/tinted "card" wrapper around every field — but Input, DatePicker's trigger, and
// TaskFormPrioritySelector's segmented control each already draw their own border, so every field
// ended up boxed twice (an outer card border around an inner input border). Left empty (rather than
// removed) so existing call sites — CreateTodoModal, TaskForm, TaskDetail, SmartTaskModal — don't
// each need their own edit; the single-border-per-field look now comes from each control itself.
export const FIELD_CARD_CLASS = '';