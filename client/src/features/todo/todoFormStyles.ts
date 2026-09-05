
export const TODO_INPUT_CLASS =
  'rounded-none border-0 border-b border-b-border px-0 bg-transparent shadow-none ' +
  'focus:ring-0 focus:border-b-primary-500 transition-colors duration-200';

export const TODO_TRIGGER_CLASS = TODO_INPUT_CLASS;

export const TODO_LABEL_CLASS =
  'flex items-center gap-1.5 text-xs font-medium text-text-muted normal-case tracking-normal mb-1.5';

// Matches the "New Ticket"/"New Delegation" header buttons elsewhere (TicketList.tsx) — a pill
// shape reads as the app's convention for this exact "primary create action in a page header"
// slot, whereas the previous `rounded font-bold` was a one-off smaller radius nothing else uses.
export const TODO_BUTTON_CLASS = 'rounded-full';