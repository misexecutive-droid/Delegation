import { NavLink, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  TicketCheck,
  ClipboardCheck,
  ListTodo,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, exact: false },
  { to: '/tickets', label: 'Tickets', icon: TicketCheck, exact: false },
  { to: '/todo', label: 'To-Do', icon: ListTodo, exact: false },
  { to: '/checklists', label: 'Checklists', icon: ClipboardCheck, exact: false, soon: true },
];

const INDICATOR_SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 rounded-t-[28px] border-t border-slate-300 bg-surface/85 dark:bg-background/85 transition-colors pb-[env(safe-area-inset-bottom)]"
      style={{
        backdropFilter: 'var(--glass-blur, blur(16px))',
        WebkitBackdropFilter: 'var(--glass-blur, blur(16px))',
      }}
      aria-label="Mobile navigation bar"
    >
      <div className="h-16 max-w-lg mx-auto px-1.5 flex items-center justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, soon }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to);

          if (soon) {
            return (
              <span
                key={to}
                title={`${label} — coming soon`}
                className="flex flex-col items-center justify-center flex-1 h-full pt-1.5 pb-1.5 cursor-not-allowed select-none opacity-40"
              >
                <div className="relative flex items-center justify-center w-12 h-[30px]">
                  <Icon size={18} strokeWidth={2} className="text-text-muted" />
                  <span className="absolute top-0 right-2.5 size-1.5 rounded-full bg-text-light" aria-hidden="true" />
                </div>
                <span className="text-[10px] leading-tight mt-1 font-medium text-text-muted">{label}</span>
              </span>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="group relative flex flex-col items-center justify-center flex-1 h-full pt-1.5 pb-1.5 cursor-pointer select-none active:scale-[0.92] transition-transform duration-150"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={INDICATOR_SPRING}
                  className="absolute -top-px h-[3px] w-7 rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                />
              )}

              <div className="relative flex items-center justify-center w-12 h-[30px]">
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    transition={INDICATOR_SPRING}
                    className="absolute inset-0 rounded-full bg-primary-500/10 dark:bg-primary-400/10"
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`relative z-10 transition-all duration-200 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 scale-110'
                      : 'text-text-muted group-hover:text-text group-hover:scale-105'
                  }`}
                />
              </div>

              <span
                className={`relative z-10 text-[10px] leading-tight mt-1 transition-all duration-200 ${
                  isActive
                    ? 'text-primary-700 dark:text-primary-300 font-bold'
                    : 'text-text-muted font-medium group-hover:text-text'
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};