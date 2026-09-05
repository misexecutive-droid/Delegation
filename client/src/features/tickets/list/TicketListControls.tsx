import { Search, X } from 'lucide-react';

interface TicketSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const TicketSearchInput = ({ value, onChange }: TicketSearchInputProps) => (
  <div className="relative w-full group/search">
    <Search
      size={15}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors duration-300 group-focus-within/search:text-primary-500 pointer-events-none"
    />
    
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search tickets..."
      className="w-full pl-10 pr-9 py-2.5 text-[13px] font-medium bg-surface-hover/50 text-text rounded-full border border-border/60 shadow-sm hover:border-border/80 focus:outline-none focus:ring-[3px] focus:ring-primary-500/15 focus:border-primary-500/50 focus:bg-surface placeholder:text-text-muted/60 transition-all duration-300"
    />
    
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text hover:bg-border/40 cursor-pointer transition-all duration-200 p-1 rounded-full animate-in zoom-in-50"
        aria-label="Clear search"
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    )}
  </div>
);