import { Search, X } from 'lucide-react';

interface TicketSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Full-width search box — kept separate from the status filter so the caller can put it on its
// own row (search benefits from real width to type into) while the compact filter sits inline
// with the other icon-sized toolbar controls.
export const TicketSearchInput = ({ value, onChange }: TicketSearchInputProps) => (
  <div className="relative w-full">
    <Search
      size={15}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search tickets..."
      className="w-full pl-10 pr-9 py-2 text-xs font-display bg-surface-hover/60 text-text rounded-full border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-surface placeholder:text-text-muted/70 transition-all"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer transition-colors p-0.5 rounded-full hover:bg-surface-hover"
        aria-label="Clear search"
      >
        <X size={13} />
      </button>
    )}
  </div>
);
