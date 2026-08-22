import { NavLink, useLocation } from 'react-router';
import {
  LayoutDashboard,
  CheckSquare,
  TicketCheck,
  ClipboardCheck,
  ListTodo,
  Menu,
} from 'lucide-react';

interface BottomNavProps {
  onToggleSidebar: () => void;
}

export const BottomNav = ({ onToggleSidebar }: BottomNavProps) => {
  const location = useLocation();

  const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: LayoutDashboard, exact: true },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare, exact: false },
    { to: '/tickets', label: 'Tickets', icon: TicketCheck, exact: false },
    { to: '/todo', label: 'To-Do', icon: ListTodo, exact: false },
    { to: '/checklists', label: 'Checklists', icon: ClipboardCheck, exact: false },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-surface/80 dark:bg-background/80 transition-colors pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]"
      style={{
        backdropFilter: 'var(--glass-blur, blur(16px))',
        WebkitBackdropFilter: 'var(--glass-blur, blur(16px))',
      }}
      aria-label="Mobile navigation bar"
    >
      <div className="h-16 max-w-lg mx-auto px-1 flex items-center justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className="group flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1.5 transition-all duration-200 cursor-pointer select-none"
            >
              {/* Active Pill Indicator */}
              <div
                className={`relative flex items-center justify-center w-12 h-[30px] rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 scale-105' 
                    : 'text-text-muted group-hover:bg-surface-hover/80 group-hover:text-text group-active:scale-95'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span 
                className={`text-[10px] leading-tight mt-1 transition-colors ${
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

        {/* Menu Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="group flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1.5 transition-all duration-200 cursor-pointer select-none"
          aria-label="Open menu"
        >
          <div className="relative flex items-center justify-center w-12 h-[30px] rounded-full transition-all duration-300 text-text-muted group-hover:bg-surface-hover/80 group-hover:text-text group-active:scale-95">
            <Menu size={20} strokeWidth={2} />
          </div>
          <span className="text-[10px] leading-tight mt-1 transition-colors text-text-muted font-medium group-hover:text-text">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};