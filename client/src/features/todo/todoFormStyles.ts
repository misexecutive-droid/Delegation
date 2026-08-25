// Reference-matched, Todo-only input/button styling: a flat underline input (no box border, just
// a bottom rule that deepens on focus) and a fully pill-shaped primary/outline button, per the
// mockup the user is matching. Deliberately kept local to Todo — passed in via the shared Input/
// Button/DatePicker's own className props — rather than editing those shared components or
// taskFormFieldStyles.ts, so every other form in the app (TaskForm, TicketForm, Settings, ...)
// keeps its current boxed style untouched.

export const TODO_INPUT_CLASS =
  'rounded-none border-0 border-b-2 border-b-border px-0 bg-transparent shadow-none ' +
  'focus:ring-0 focus:border-b-primary-600 transition-colors duration-200';

// Same underline treatment applied to DatePicker's trigger button, so the due-date field reads as
// one more plain-input row instead of a boxed control sitting next to underline ones.
export const TODO_TRIGGER_CLASS = TODO_INPUT_CLASS;

// Includes its own flex/gap layout (not just relying on Input's base label classes) since it's
// also used directly on the plain <label> in front of DatePicker, which has no such base to fall
// back on.
export const TODO_LABEL_CLASS =
  'flex items-center gap-1.5 text-xs font-medium text-text-muted normal-case tracking-normal mb-1.5';

export const TODO_BUTTON_CLASS = 'rounded-full font-bold';