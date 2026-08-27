import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, type LucideIcon } from 'lucide-react';

export interface FabAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** Small corner badge on the sub-action button, e.g. "Soon". */
  badge?: string;
}

export interface FabProps {
  actions: FabAction[];
  /** Icon on the closed button when there's more than one action. Ignored for a single action —
   *  that button shows its own action's icon instead, since there's nothing to disambiguate. */
  icon?: LucideIcon;
  'aria-label'?: string;
}

const TRANSITION = { duration: 0.18 };

// Shared mobile-only floating action button. One action opens directly on tap; more than one
// expands into labeled sub-actions first. Every call site gets the exact same size, color, and
// position — this is the one place those values are defined, rather than each page approximating
// the same look on its own.
export const Fab = ({ actions, icon: Icon = Plus, 'aria-label': ariaLabel }: FabProps) => {
  const [expanded, setExpanded] = useState(false);
  const isSingleAction = actions.length === 1;
  const singleAction = isSingleAction ? actions[0] : null;

  const handleMainClick = () => {
    if (singleAction) {
      if (!singleAction.disabled) singleAction.onClick();
    } else {
      setExpanded((v) => !v);
    }
  };

  return createPortal(
    <>
      {/* Tap-outside-to-close backdrop — invisible, just catches the dismiss tap. */}
      {!isSingleAction && expanded && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setExpanded(false)} aria-hidden="true" />
      )}

      {/* Portalled to <body> — the calling page typically renders inside a Framer Motion route-
          transition wrapper, which applies its own transform/filter and would otherwise become
          the containing block for a `fixed` descendant, breaking it relative to the real
          viewport. */}
      <div
        className="md:hidden fixed right-5 z-40 flex flex-col items-end gap-3"
        style={{ bottom: 'calc(4rem + 1.5rem + env(safe-area-inset-bottom))' }}
      >
        {!isSingleAction && (
          <AnimatePresence>
            {expanded && (
              <motion.div className="flex flex-col items-end gap-3">
                {actions.map((action, i) => (
                  <motion.div
                    key={action.key}
                    className="flex items-center gap-2.5"
                    initial={{ opacity: 0, y: 12, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.8 }}
                    transition={{ ...TRANSITION, delay: i * 0.04 }}
                  >
                    <span className="px-2.5 py-1 rounded-full bg-surface border border-border/60 shadow-sm text-xs font-medium text-text whitespace-nowrap">
                      {action.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => { if (!action.disabled) { action.onClick(); setExpanded(false); } }}
                      disabled={action.disabled}
                      aria-label={action.label}
                      className="relative flex items-center justify-center size-11 rounded-full bg-surface border border-border text-primary-600 shadow-lg transition-transform duration-200 active:scale-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <action.icon size={18} strokeWidth={2.5} />
                      {action.badge && (
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-surface-hover border border-border text-text-light">
                          {action.badge}
                        </span>
                      )}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <button
          type="button"
          onClick={handleMainClick}
          disabled={singleAction?.disabled}
          aria-label={ariaLabel ?? singleAction?.label ?? (expanded ? 'Close quick actions' : 'Quick actions')}
          aria-expanded={isSingleAction ? undefined : expanded}
          className="flex items-center justify-center size-14 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30 transition-transform duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <motion.span
            animate={{ rotate: !isSingleAction && expanded ? 135 : 0 }}
            transition={TRANSITION}
            className="flex"
          >
            {singleAction ? <singleAction.icon size={24} strokeWidth={2.5} /> : <Icon size={24} strokeWidth={2.5} />}
          </motion.span>
        </button>
      </div>
    </>,
    document.body,
  );
};
