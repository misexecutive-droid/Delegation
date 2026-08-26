import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Contact,
  TicketCheck,
  Settings,
  ListChecks,
  ClipboardList,
  FileDown,
  Network,
  CheckSquare,
  LogOut,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useAuth } from "../../context/AuthContext";
import { BottomNav } from "../../components/layout";
import { RouteFallback } from "../../components/skeleton";
import { AdminHeader } from "./AdminHeader";
import { AdminChromeAccents } from "./AdminChromeAccents";

/** Utility for intelligent Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Navigation Config ---
interface AdminNavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end: boolean;
}

const NAV: AdminNavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview & Analytics', end: true },
  { to: '/admin/directory', icon: Contact, label: 'Directory', end: false },
  { to: '/admin/org-structure', icon: Network, label: 'Org Structure', end: false },
  { to: '/admin/checklist-templates', icon: ListChecks, label: 'Checklists', end: false },
  { to: '/admin/tickets', icon: TicketCheck, label: 'Tickets', end: false },
  { to: '/tasks/team', icon: ClipboardList, label: 'Team Delegations', end: false },
  { to: '/admin/reports', icon: FileDown, label: 'Reports', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
];

// The sidebar is intentionally a fixed navy "chrome" — like the reference layout's colored rail —
// rather than a theme-reactive surface, so these classes have no dark: variants of their own.
const NAV_LINK_BASE =
  "group relative flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]";
const NAV_LINK_ACTIVE = "bg-white text-primary-700 shadow-sm";
const NAV_LINK_INACTIVE = "text-white/65 hover:bg-white/10 hover:text-white";
const NAV_ICON_ACTIVE = "text-primary-700";
const NAV_ICON_INACTIVE = "text-white/50 group-hover:text-white/80";
const LOGOUT_BUTTON = "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white/65 hover:bg-white/10 hover:text-white transition-all duration-200 cursor-pointer";

export const AdminLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );

  // `sidebarOpen` doubles as "desktop expanded/collapsed" and "mobile drawer open/closed" — it's
  // only seeded from viewport width once, above, so resizing across the 768px breakpoint without
  // a reload (e.g. desktop -> mobile) would otherwise leave a stale value: the mobile drawer could
  // render already open (with its backdrop) just because it was "open" as a desktop sidebar.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Longest matching `to` wins, so a more specific route resolves to its own label instead of
  // falling through to a shorter prefix match.
  const currentNav = NAV
    .filter((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-svh overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <AdminHeader onToggleSidebar={() => setSidebarOpen(v => !v)} pageLabel={currentNav?.label ?? 'Overview'} />

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile Backdrop Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* 1. Mobile Drawer */}
        <aside
          className={cn(
            "md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[80vw] h-full flex flex-col rounded-r-3xl bg-gradient-to-b from-slate-950 via-primary-800 to-primary-600 px-4 pt-8 pb-6 shadow-2xl transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          )}
        >
          <AdminChromeAccents scale="tall" />

          {/* Brand — the header's own user dropdown already shows who's signed in and offers
              sign-out, so the sidebar's top slot is the app brand instead of a duplicate profile. */}
          <div className="flex items-center gap-3 pb-6 mb-4 border-b border-white/10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 shrink-0">
              <CheckSquare size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">
                TaskMatrix
              </span>
              <span className="text-xs font-medium text-white/60 truncate">
                Admin
              </span>
            </div>
          </div>

          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3 px-2">
            Navigation
          </p>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {NAV.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) => cn(NAV_LINK_BASE, isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE)}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn("w-[17px] h-[17px] shrink-0 transition-all duration-300 group-hover:scale-110", isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE)}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className="truncate">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Log Out — pinned below the (scrollable) nav list, separated by its own divider */}
          <div className="pt-4 mt-2 border-t border-white/10 shrink-0">
            <button type="button" onClick={logout} className={LOGOUT_BUTTON}>
              <LogOut className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">Log out</span>
            </button>
          </div>
        </aside>

        {/* 2. Desktop Sidebar — a floating rounded card set off from the page background, filled
            with the app's primary color per the reference layout's dark rail concept. */}
        <aside
          className={cn(
            "hidden md:flex relative flex-col shrink-0 m-3 rounded-2xl bg-gradient-to-b from-slate-950 via-primary-800 to-primary-600 shadow-lg shadow-primary-900/20",
            "transition-all duration-300 ease-in-out overflow-hidden py-6",
            sidebarOpen ? "w-64 px-4" : "w-[84px] px-3"
          )}
        >
          <AdminChromeAccents scale="tall" />

          {/* Brand — the header's own user dropdown already shows who's signed in and offers
              sign-out, so the sidebar's top slot is the app brand instead of a duplicate profile. */}
          <div className={cn(
            "flex items-center gap-3 pb-6 mb-4 border-b border-white/10 transition-all duration-300",
            !sidebarOpen && "justify-center"
          )}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 shrink-0 transition-transform hover:scale-105">
              <CheckSquare size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className={cn("flex flex-col min-w-0 transition-opacity duration-300", !sidebarOpen && "hidden opacity-0")}>
              <span className="text-sm font-bold text-white truncate">
                TaskMatrix
              </span>
              <span className="text-xs font-medium text-white/60 truncate">
                Admin
              </span>
            </div>
          </div>

          <p className={cn(
            "text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3 px-2 transition-opacity duration-300",
            !sidebarOpen && "hidden opacity-0"
          )}>
            Navigation
          </p>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {NAV.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) => cn(
                  NAV_LINK_BASE,
                  "focus-visible:ring-offset-1 focus-visible:ring-offset-primary-700",
                  !sidebarOpen && "justify-center px-0",
                  isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE
                )}
                title={!sidebarOpen ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn("w-[17px] h-[17px] shrink-0 transition-all duration-300 group-hover:scale-110", isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE)}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className={cn(
                      "truncate transition-opacity duration-300",
                      !sidebarOpen && "hidden opacity-0"
                    )}>
                      {label}
                    </span>

                    {/* Active Indicator Pip (Visible only when sidebar is collapsed) */}
                    {!sidebarOpen && isActive && (
                      <span className="hidden md:block absolute left-1 w-1 h-1/2 bg-white rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Log Out — pinned below the (scrollable) nav list, separated by its own divider */}
          <div className="pt-4 mt-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={logout}
              title={!sidebarOpen ? "Log out" : undefined}
              className={cn(LOGOUT_BUTTON, !sidebarOpen && "justify-center px-0")}
            >
              <LogOut className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
              <span className={cn("truncate", !sidebarOpen && "hidden opacity-0")}>Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-slate-50 dark:bg-slate-950">
          {/* pb-44 clears BottomNav plus any page's floating Fab (e.g. Tickets' Create FAB),
              which floats ~56px above the nav — see Dashboard.tsx's identical comment. */}
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-5 lg:p-8 pb-44 md:pb-8">

            {/* Route Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full"
              >
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>

          </div>
        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
