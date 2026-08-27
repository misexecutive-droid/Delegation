import { useEffect, useState, type ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '../button';
import { Modal } from '../modal';

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export const PillButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer border ${
      active
        ? 'bg-primary-50/80 border-primary-300 text-primary-700 shadow-sm dark:bg-primary-900/30 dark:border-primary-700/80 dark:text-primary-300'
        : 'bg-surface border-border/60 text-text-muted hover:text-text hover:bg-surface-hover hover:border-border'
    }`}
  >
    {children}
  </button>
);

// Groups filter controls into distinct card-like blocks — shared section chrome for both
// feature wrappers' section JSX.
export const FilterSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2.5">
    <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">{title}</span>
    <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/40 dark:bg-surface-hover/10">
      {children}
    </div>
  </div>
);

interface FiltersPopoverProps<TFilters> {
  filters: TFilters;
  onChange: (patch: Partial<TFilters>) => void;
  onClearAll: () => void;
  activeCount: number;
  /** The filter sections shared between the desktop dropdown and the mobile modal — receives the
   *  live draft plus a setter, and (since one section, e.g. Task's "Add user" shortcut, needs to
   *  close the panel itself) a `closePopover` callback. */
  renderSections: (draft: TFilters, updateDraft: (fn: (d: TFilters) => TFilters) => void, closePopover: () => void) => ReactNode;
  /** Live preview chips for the current draft, rendered above the sections on both desktop and mobile. */
  renderChips: (draft: TFilters, updateDraft: (fn: (d: TFilters) => TFilters) => void) => FilterChip[];
  /** Extra sections rendered only inside the mobile modal — desktop keeps these as their own
   *  separate toolbar dropdowns instead, since a phone-width toolbar has no room for more buttons. */
  renderMobileOnlySections?: (draft: TFilters, updateDraft: (fn: (d: TFilters) => TFilters) => void) => ReactNode;
}

// Below this width the panel opens as a full Modal (Radix Dialog, centered with a backdrop)
// instead of a Popper-anchored dropdown — an anchored popover next to a small toolbar button
// reads awkwardly on a phone (it has to squeeze itself near the trigger rather than just being
// the thing on screen), the same reasoning DateRangePicker already uses a Modal for.
const MOBILE_QUERY = '(max-width: 639px)';

// The generic filters-popover shell shared by Delegation and Tickets: desktop/mobile responsive
// split, a draft-vs-applied state machine (desktop stages changes behind "Apply filters"; mobile
// commits every change immediately since there's no room for a separate apply step), the trigger
// button, and the chips/footer chrome. Each feature supplies its own filter fields as JSX via
// `renderSections`/`renderChips`/`renderMobileOnlySections` — this component never knows what a
// "status" or "priority" is.
export function FiltersPopover<TFilters extends object>({
  filters, onChange, onClearAll, activeCount, renderSections, renderChips, renderMobileOnlySections,
}: FiltersPopoverProps<TFilters>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TFilters>(filters);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onMqChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onMqChange);
    return () => mq.removeEventListener('change', onMqChange);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(filters);
    setOpen(next);
  };

  const openMobile = () => {
    setDraft(filters);
    setOpen(true);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  // On mobile there's no separate "Apply" step — every toggle commits immediately, so this
  // updates the draft and, on mobile only, pushes it straight to the parent's applied filters
  // in the same tick. Desktop keeps staging changes in `draft` until "Apply filters" is clicked.
  const updateDraft = (updater: (d: TFilters) => TFilters) => {
    setDraft((prev) => {
      const next = updater(prev);
      if (isMobile) onChange(next);
      return next;
    });
  };

  const closePopover = () => setOpen(false);

  const chips = renderChips(draft, updateDraft);

  const triggerInner = (
    <>
      <Filter size={14} className={activeCount > 0 ? "text-primary-600 dark:text-primary-400" : "text-text-muted"} />
      <span className={`text-xs font-medium hidden md:inline ${activeCount > 0 ? "text-primary-700 dark:text-primary-300" : ""}`}>
        Filters
      </span>
      {activeCount > 0 && (
        <span className="flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-1 text-[10px] font-bold rounded-full bg-primary-600 text-white shadow-sm ml-0.5">
          {activeCount}
        </span>
      )}
    </>
  );

  const triggerClassName = `h-9 px-3 gap-2 border rounded-lg transition-colors ${
    activeCount > 0
      ? 'bg-primary-50 border-primary-200 hover:bg-primary-100 dark:bg-primary-900/20 dark:border-primary-800/50'
      : 'bg-surface border-border/60 hover:bg-surface-hover'
  }`;

  // Horizontally scrollable draft chips - hides scrollbar for a clean look
  const chipsRow = chips.length > 0 && (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1.5 pl-3 pr-1 py-1 text-[11px] font-bold rounded-full bg-primary-50 text-primary-700 border border-primary-200/60 shadow-sm dark:bg-primary-900/30 dark:border-primary-800/80 dark:text-primary-300 shrink-0"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}`}
            className="p-1 rounded-full hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors cursor-pointer"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
    </div>
  );

  const sectionsBody = renderSections(draft, updateDraft, closePopover);
  const mobileOnlyBody = renderMobileOnlySections?.(draft, updateDraft);

  const footerButtons = (
    <>
      <button
        type="button"
        onClick={() => { onClearAll(); setOpen(false); }}
        disabled={activeCount === 0}
        className="text-xs font-bold text-text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg hover:bg-danger/10"
      >
        Clear all
      </button>
      <Button variant="primary" size="md" className="flex-1 rounded-xl font-bold shadow-md" onClick={apply}>
        Apply filters
      </Button>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Button
          variant="secondary"
          size="sm"
          className={triggerClassName}
          aria-label="Filters"
          title="Filters"
          onClick={openMobile}
        >
          {triggerInner}
        </Button>
      ) : (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className={triggerClassName} aria-label="Filters" title="Filters">
              {triggerInner}
            </Button>
          </DropdownMenuTrigger>

          {/*
            The Dropdown Content is divided into a Sticky Header, Scrollable Body, and Sticky Footer.
          */}
          <DropdownMenuContent align="start" className="w-[26rem] max-h-[85vh] p-0 flex flex-col rounded-2xl border-border/60 shadow-2xl overflow-hidden bg-surface">

            {/* 1. STICKY HEADER */}
            <div className="flex flex-col gap-3 p-5 border-b border-border/50 bg-surface/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <Filter size={16} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-text">Refine View</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {chipsRow}
            </div>

            {/* 2. SCROLLABLE BODY */}
            <div className="flex flex-col gap-6 p-5 overflow-y-auto overscroll-contain">
              {sectionsBody}
            </div>

            {/* 3. STICKY FOOTER */}
            <div className="flex items-center justify-between gap-4 p-5 border-t border-border/50 bg-surface/95 backdrop-blur-md sticky bottom-0 z-20 shrink-0">
              {footerButtons}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isMobile && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          icon={<Filter className="w-4 h-4 text-primary-600" />}
          title="Refine view"
          size="lg"
          bodyClassName="gap-4"
        >
          {chipsRow}
          {sectionsBody}
          {mobileOnlyBody}
        </Modal>
      )}
    </>
  );
}
