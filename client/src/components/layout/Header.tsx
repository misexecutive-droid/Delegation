import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NavLink } from 'react-router';
import {
  CheckSquare,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { Dropdown, type DropdownAction } from '../dropdown';
import { HeaderSearchInput } from './HeaderSearchInput';

// Refined to be more modern and touch-friendly (fully rounded, slightly larger tap target)
export const ICON_BUTTON_CLASS =
  'inline-flex items-center justify-center size-9 rounded-full text-text-muted ' +
  'transition-all duration-200 ease-out cursor-pointer ' +
  'hover:text-text hover:bg-surface-hover hover:shadow-sm ' +
  'active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50';

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const Header = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const accountActions: DropdownAction[] = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Settings', to: '/settings', icon: Settings },
    {
      label: 'Sign out',
      onClick: logout,
      icon: LogOut,
      variant: 'destructive',
      separatorBefore: true,
    },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-surface/80 dark:bg-background/80 backdrop-blur-md transition-colors shadow-sm shadow-black/5"
      style={{
        backdropFilter: 'var(--glass-blur, blur(12px))',
        WebkitBackdropFilter: 'var(--glass-blur, blur(12px))',
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center gap-3 sm:gap-4">

          {/* Left Module: Sidebar Toggle + Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className={ICON_BUTTON_CLASS}
                title="Toggle navigation sidebar"
                aria-label="Toggle navigation sidebar"
              >
                <PanelLeft size={20} strokeWidth={2} />
              </button>
            )}

            <NavLink
              to="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 rounded-lg py-1.5 px-2 -ml-2 transition-colors hover:bg-surface-hover"
            >
              <div className="size-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center shrink-0 shadow-md shadow-primary-500/20 group-hover:scale-105 group-hover:shadow-primary-500/30 transition-all duration-300">
                <CheckSquare size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="hidden sm:inline font-display font-bold text-text text-[15px] tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                TaskMatrix
              </span>
            </NavLink>
          </div>

          {/* Center Module: Search — only when user is logged in */}
          {user && (
            <div className="hidden md:flex flex-1 justify-center px-4">
              <div className="w-full max-w-md">
                <HeaderSearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search checklists, tasks, tickets…"
                />
              </div>
            </div>
          )}

          {/* Right Module: grouped action pill + account */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            
            {/* Quick Actions Pill */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-surface-hover/60 border border-border/40 shadow-sm">
              {user && <NotificationBell />}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`${ICON_BUTTON_CLASS} overflow-hidden size-8`}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label="Toggle visual theme"
              >
                <span
                  className={`inline-flex transition-transform duration-500 ${
                    theme === 'light' ? 'rotate-0' : 'rotate-180'
                  }`}
                >
                  {theme === 'light' ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
                </span>
              </button>
            </div>

            {/* User Dropdown Profile (Desktop) */}
            {user && (
              <div className="hidden sm:block">
                <Dropdown
                  items={accountActions}
                  trigger={
                    <button
                      title={user.name}
                      className="flex items-center gap-2.5 h-10 pl-1 pr-3 rounded-full bg-surface border border-border/60 shadow-sm text-text-secondary cursor-pointer transition-all duration-200 hover:bg-surface-hover hover:border-border hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 group"
                    >
                      <span className="relative flex items-center justify-center size-8 rounded-full bg-primary-600 text-white font-bold text-[11px] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {initials || <User size={14} strokeWidth={2.5} />}
                        {/* Minimal online indicator */}
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-surface" aria-hidden="true" />
                      </span>
                      <span className="hidden lg:flex flex-col items-start min-w-0 leading-tight py-0.5">
                        <span className="max-w-[120px] truncate text-[13px] font-bold text-text">{user.name}</span>
                        {user.role && (
                          <span className="max-w-[120px] truncate text-[11px] font-medium text-text-muted mt-0.5">{titleCase(user.role)}</span>
                        )}
                      </span>
                      <ChevronDown size={14} className="text-text-muted shrink-0 ml-1 group-hover:text-text transition-colors" strokeWidth={2.5} />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};