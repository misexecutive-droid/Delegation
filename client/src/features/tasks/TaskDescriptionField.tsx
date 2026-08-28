import type { ReactNode } from 'react';

interface TaskDescriptionFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;

  toolbar?: ReactNode;

  children?: ReactNode;
}

export const TaskDescriptionField = ({
  id = 'description',
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = 'Add more detail…',
  rows = 6,
  toolbar,
  children,
}: TaskDescriptionFieldProps) => (
  <div className="flex flex-col gap-1.5 flex-1 min-h-0">
  
    <div className="flex flex-col flex-1 min-h-0 rounded-md border border-border bg-surface transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20 overflow-hidden">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className="w-full flex-1 min-h-[100px] px-3 py-2.5 text-sm text-text bg-transparent outline-none resize-none placeholder:text-text-light disabled:text-text-light disabled:cursor-not-allowed"
      />

      {toolbar && (
        <div className="flex items-center justify-end gap-0.5 px-2 py-1 border-t border-border/60 bg-surface-hover/40 shrink-0">
          {toolbar}
        </div>
      )}

      {children && (
        <div className="flex flex-col gap-2 px-3 py-2.5 border-t border-border/60 shrink-0">
          {children}
        </div>
      )}
    </div>
  </div>
);
