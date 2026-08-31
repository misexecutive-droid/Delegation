import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, type LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  /** Icon on the closed button when there's more than one action. Ignored for a single action. */
  icon?: LucideIcon;
  'aria-label'?: string;
}

const TRANSITION = { type: 'spring', stiffness: 400, damping: 25 };

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
      {/* Tap-outside-to-close backdrop */}
      <AnimatePresence>
        {!isSingleAction && expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        className="md:hidden fixed right-6 z-40 flex flex-col items-end gap-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {!isSingleAction && (
          <AnimatePresence>
            {expanded && (
              <motion.div className="flex flex-col items-end gap-4">
                {actions.map((action, i) => (
                  <motion.div
                    key={action.key}
                    className="flex items-center gap-3.5"
                    initial={{ opacity: 0, y: 16, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.8 }}
                    transition={{ ...TRANSITION, delay: (actions.length - 1 - i) * 0.04 }}
                  >
                    <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 tracking-wide whitespace-nowrap">
                      {action.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => { if (!action.disabled) { action.onClick(); setExpanded(false); } }}
                      disabled={action.disabled}
                      aria-label={action.label}
                      className={cn(
                        "relative flex items-center justify-center size-12 rounded-full bg-white border border-slate-200 text-primary-600 shadow-md transition-all duration-200 cursor-pointer active:scale-90",
                        "hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
                      )}
                    >
                      <action.icon size={20} strokeWidth={2.5} />
                      {action.badge && (
                        <span className="absolute -top-2 -right-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 shadow-sm">
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
          className={cn(
            "flex items-center justify-center size-14 rounded-full bg-primary-600 text-white cursor-pointer transition-all duration-300 ease-out",
            "shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 hover:bg-primary-500",
            "active:scale-95 ring-4 ring-transparent hover:ring-primary-100/50 focus:outline-none focus:ring-primary-100/50",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:hover:scale-100 disabled:hover:-translate-y-0",
            (!isSingleAction && expanded) ? "scale-95 bg-primary-700 shadow-md" : "hover:-translate-y-1"
          )}
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
    document.body
  );
};