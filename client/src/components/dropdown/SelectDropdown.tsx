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

const TRIGGER_CLASS = cn(
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 transition-all duration-200 outline-none cursor-pointer group",
  "hover:border-slate-300 hover:bg-slate-100/50",
  "focus-visible:bg-white focus-visible:border-primary-400 focus-visible:ring-4 focus-visible:ring-primary-50/50",
  "disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200"
);

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
          <ChevronDown 
            size={16} 
            className="shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-slate-500 group-focus-visible:text-primary-500" 
          />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align={align}
        className={cn(
          'min-w-[10rem] p-1.5 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 animate-in fade-in-80 zoom-in-95 duration-200',
          contentClassName
        )}
        collisionBoundary={triggerEl?.closest('[data-slot="dialog-content"]') ?? undefined}
        collisionPadding={16}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={cn(
                "flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer outline-none active:scale-[0.98]",
                isSelected 
                  ? "text-primary-700 bg-primary-50/50" 
                  : "text-slate-700 focus:bg-slate-100 focus:text-slate-900"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && (
                <Check size={16} strokeWidth={2.5} className="shrink-0 text-primary-600" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}