import { ACTIVITY_CATEGORY_ORDER, ACTIVITY_CATEGORY_LABEL, ACTIVITY_CATEGORY_DOT_CLASS, type ActivityCategory } from './dashboardDisplay';

interface ActivityCategoryFilterProps {
  active: ReadonlySet<ActivityCategory>;
  onToggle: (category: ActivityCategory) => void;
}

// One filter, shared by the bar chart and the compliance gauges below it — toggling a category
// here changes both at once, instead of each widget needing its own copy of this control.
export const ActivityCategoryFilter = ({ active, onToggle }: ActivityCategoryFilterProps) => (
  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter activity by category">
    {/* These chips carry the chart's only colour key — each dot is the exact fill of that
        category's segment in the stacked bars. Saying so turns a row of filters that happened to
        be colour-coded into a legend the chart can actually be read against; without it nothing
        on the page connects a bar colour to a category name. */}
    <span className="text-[11px] font-display font-semibold text-text-muted tracking-wide">Showing</span>
    {ACTIVITY_CATEGORY_ORDER.map((category) => {
      const isActive = active.has(category);
      return (
        <button
          key={category}
          type="button"
          onClick={() => onToggle(category)}
          aria-pressed={isActive}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-full border text-[11px] font-display font-semibold transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
            isActive
              ? 'bg-surface border-border/60 text-text-secondary hover:border-border-hover'
              : 'bg-transparent border-border/30 text-text-light opacity-60 hover:opacity-100 hover:border-border/50'
          }`}
        >
          <span className={`size-1.5 rounded-full shrink-0 ${isActive ? ACTIVITY_CATEGORY_DOT_CLASS[category] : 'bg-text-light'}`} />
          {ACTIVITY_CATEGORY_LABEL[category]}
        </button>
      );
    })}
  </div>
);
