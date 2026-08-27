import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SelectDropdownOption<Value extends string> {
  value: Value;
  label: string;
}

interface SelectDropdownProps<Value extends string> {
  value: Value;
  onChange: (value: Value) => void;
  options: SelectDropdownOption<Value>[];
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  contentClassName?: string;
  'aria-label'?: string;
}

const TRIGGER_CLASS =
  'flex h-10 w-full items-center justify-between gap-1.5 rounded border border-border bg-surface pl-2.5 pr-2 text-sm font-medium text-text shadow-sm ' +
  'transition-all outline-none cursor-pointer hover:border-border ' +
  'focus-visible:ring-0 focus-visible:border-border ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

// A themed, in-app replacement for a native <select> — same trigger footprint, but the option
// list is our own Radix DropdownMenu popover (already proven safe inside this app's Dialog-based
// Modal, unlike the shadcn Select primitive — see TaskFormReminderField's history) so it looks
// consistent with every other menu in the app instead of falling back to OS chrome.
export function SelectDropdown<Value extends string>({
  value,
  onChange,
  options,
  disabled = false,
  align = 'start',
  triggerClassName,
  contentClassName,
  ...rest
}: SelectDropdownProps<Value>) {
  const selected = options.find((o) => o.value === value);
  // Reading a ref's .current during render isn't allowed (it can go stale without triggering a
  // re-render), so the trigger's DOM node is tracked in state via a callback ref instead.
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={setTriggerEl}
          type="button"
          disabled={disabled}
          aria-label={rest['aria-label']}
          className={cn(TRIGGER_CLASS, triggerClassName)}
        >
          <span className="truncate">{selected?.label ?? '—'}</span>
          <ChevronDown size={14} className="shrink-0 text-text-light" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn('min-w-[8rem]', contentClassName)}
        // See Combobox's identical comment: constrains flip/shift to the modal's own content
        // element instead of the viewport, so a trigger near the bottom of a modal doesn't spill
        // the menu out past the modal's card.
        collisionBoundary={triggerEl?.closest('[data-slot="dialog-content"]') ?? undefined}
        collisionPadding={16}
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className="justify-between gap-2"
          >
            {opt.label}
            {opt.value === value && <Check size={14} className="text-primary-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
