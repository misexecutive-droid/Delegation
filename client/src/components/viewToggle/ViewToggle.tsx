import type { LucideIcon } from 'lucide-react';

export interface ViewTab<V extends string> {
  key: V;
  label: string;
  icon: LucideIcon;
}

interface ViewToggleProps<V extends string> {
  tabs: ViewTab<V>[];
  value: V;
  onChange: (key: V) => void;
}

// A pill-group view switcher (e.g. List/Board) — shared shell behind the Delegation and Tickets
// list pages' view toggles, same "generic component + feature-owned tab data" split as
// QuickFilterStats.
export function ViewToggle<V extends string>({ tabs, value, onChange }: ViewToggleProps<V>) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-hover/50 border border-border/40">
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          title={`${tab.label} view`}
          aria-label={`${tab.label} view`}
          aria-pressed={value === tab.key}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
            value === tab.key
              ? 'bg-background text-text border border-border ring-1 ring-border/50'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
          }`}
        >
          <tab.icon size={14} />
          <span className="hidden md:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
