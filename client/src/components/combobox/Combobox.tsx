import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader } from '../loaders/Loader';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Pinned as the first, always-present option (e.g. "No department") — its value is typically ''. */
  emptyOptionLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Renders a pinned "+ Create new…" row at the end of the list. Called with whatever text is
   *  currently typed in the search box, so the caller can prefill a name field with it. */
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
}

// Wraps the substring of `label` that matches `query` in a <mark> — lets a long list read as
// "type 2-3 letters, see exactly why each result matched" instead of a plain filtered list.
const highlightMatch = (label: string, query: string): ReactNode => {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-sm">
        {label.slice(idx, idx + query.length)}
      </mark>
      {label.slice(idx + query.length)}
    </>
  );
};

// A button trigger showing the current value (same shape as DatePicker's trigger) that opens a
// small floating popup with a search box + list — not an always-editable text input, and not an
// inline panel that pushes the rest of the form down. Radix's Popover owns open/close, outside-
// click, and Escape entirely on its own here (same as the Assignees/Notification-days popups),
// since the search box now lives inside the popup content instead of doubling as the trigger.
export const Combobox = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Search...',
  emptyOptionLabel,
  isLoading,
  disabled,
  className,
  onCreateNew,
  createNewLabel = 'Create new',
}: ComboboxProps) => {
  const allOptions = useMemo<ComboboxOption[]>(
    () => (emptyOptionLabel !== undefined ? [{ value: '', label: emptyOptionLabel }, ...options] : options),
    [options, emptyOptionLabel]
  );
  const selected = allOptions.find((o) => o.value === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Reading a ref's .current during render isn't allowed (it can go stale without triggering a
  // re-render), so the trigger's DOM node is tracked in state via a callback ref instead.
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);

  const trimmedQuery = query.trim();
  const filtered = useMemo(
    () => (trimmedQuery ? allOptions.filter((o) => o.label.toLowerCase().includes(trimmedQuery.toLowerCase())) : allOptions),
    [allOptions, trimmedQuery]
  );
  // Clamp rather than reset-via-effect: if the list shrinks (e.g. typing narrows it further),
  // the cursor just settles on the new last item instead of needing a synced side effect.
  const safeHighlightedIndex = Math.min(highlightedIndex, Math.max(filtered.length - 1, 0));

  const commit = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(Math.min(safeHighlightedIndex + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(Math.max(safeHighlightedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[safeHighlightedIndex];
      if (option) commit(option);
    }
    // Escape is left to Radix's own DismissableLayer, which already closes the popover.
  };

  return (
    <Popover
      open={open}
      // Modal (unlike every other Popover/DropdownMenu in the app): this one has a real editable
      // search input living inside it, so it genuinely needs Radix's built-in focus trap — a non-
      // modal Popover's FocusScope doesn't trap at all, so auto-focusing that input moves DOM focus
      // outside the parent Dialog's own trapped boundary, which yanks it straight back and, with no
      // Radix-side guard for that case, reads as "focus left" and dismisses the popup out from
      // under the click that was meant to select something. `modal` here uses Radix's own dedicated
      // handling for exactly this nested-focus-trap case (already proven at DropdownMenu, which
      // traps focus unconditionally) instead of a custom guard fighting the same fight blind.
      modal
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery('');
          setHighlightedIndex(0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={setTriggerEl}
          type="button"
          id={id}
          disabled={disabled || isLoading}
          aria-expanded={open}
          className={cn(
            'press-feedback flex items-center gap-2 w-full h-10 px-3 rounded-md border bg-surface text-sm transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-400',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border',
            open ? 'border-primary-500' : 'border-border hover:border-primary-400',
            className,
          )}
        >
          <Search size={14} className="text-text-light shrink-0" />
          <span className={cn('flex-1 text-left truncate', selected?.label ? 'text-text font-medium' : 'text-text-muted font-medium')}>
            {isLoading ? 'Loading...' : (selected?.label || placeholder)}
          </span>
          {isLoading ? (
            <Loader size="sm" variant="slate" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown size={14} className={cn('shrink-0 text-text-light transition-transform duration-200', open && 'rotate-180')} />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        // Same fix as everywhere else: constrain flip/shift to the modal's own content element
        // instead of the viewport, so a trigger near the bottom of a modal doesn't spill the
        // popup out past the modal's card.
        collisionBoundary={triggerEl?.closest('[data-slot="dialog-content"]') ?? undefined}
        collisionPadding={16}
        // Cap to Radix's own computed available space (not just an arbitrary max-h-52) and let the
        // list — not the whole popup — be the scrolling region, with the search box pinned above
        // it. Without binding to this variable the popup could ask for more height than actually
        // fits within the collision boundary and just get cut off with nothing to scroll.
        className="w-(--radix-popover-trigger-width) max-h-(--radix-popover-content-available-height) flex flex-col p-2"
      >
        <div className="relative mb-1.5 shrink-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
          <input
            autoFocus
            value={query}
            placeholder="Type to search…"
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full h-8 rounded-md border border-border bg-background pl-8 pr-2 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:border-primary-400 focus:ring-primary-400/30"
          />
        </div>

        <ul id={id ? `${id}-listbox` : undefined} role="listbox" className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-text-muted font-display">No matches</li>
          ) : (
            filtered.map((option, i) => (
              <li
                key={option.value || '__empty__'}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(option);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={cn(
                  'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm font-display cursor-pointer transition-colors',
                  i === safeHighlightedIndex ? 'bg-primary-500/10 text-primary-700 dark:text-primary-400' : 'text-text hover:bg-surface-hover',
                  !option.value && 'text-text-muted italic'
                )}
              >
                <span className="truncate">{highlightMatch(option.label, trimmedQuery)}</span>
                {option.value === value && <Check size={14} className="shrink-0 text-primary-600 dark:text-primary-400" />}
              </li>
            ))
          )}

          {onCreateNew && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateNew(trimmedQuery);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-display font-medium text-primary-600 dark:text-primary-400 cursor-pointer transition-colors hover:bg-primary-500/10 border-t border-border mt-1 pt-2.5"
            >
              <Plus size={14} className="shrink-0" />
              <span className="truncate">
                {trimmedQuery ? `${createNewLabel} "${trimmedQuery}"` : createNewLabel}
              </span>
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
