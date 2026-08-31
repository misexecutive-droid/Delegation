import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Contact,
  TicketCheck,
  Settings,
  ClipboardList,
  FileDown,
  Network,
  CheckSquare,
  LogOut,
  Repeat,
  ChevronDown,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useAuth } from "../../context/AuthContext";
import { BottomNav } from "../../components/layout";
import { RouteFallback } from "../../components/skeleton";
import { Breadcrumbs } from "../../components/breadcrumbs";
import { AdminHeader } from "./AdminHeader";
import { AdminChromeAccents } from "./AdminChromeAccents";
import { getAdminBreadcrumbs } from "./adminBreadcrumbs";

/** Utility for intelligent Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Navigation Config ---
interface AdminNavChild {
  to: string;
  label: string;
}

interface AdminNavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end: boolean;
  // A section with children renders as an expandable group in the sidebar instead of a single
  // flat link, so every page that belongs to it is visible in the nav itself — not just
  // discoverable after the fact via the page's own breadcrumb.
  children?: AdminNavChild[];
}

// Two distinct checklist systems, both nested under one "Checklists" group so the sidebar shows
// what's inside instead of leaving them as unrelated-looking flat entries: recurring,
// store-scheduled checklists (built in the Builder wizard, auto-generated on a cadence) vs.
// one-off templates applied by hand to a single Task/Ticket.
const CHECKLIST_CHILDREN: AdminNavChild[] = [
  { to: '/admin/scheduled-checklists', label: 'Recurring Checklists' },
  { to: '/admin/checklist-compliance', label: 'Checklist Compliance' },
  { to: '/admin/checklist-templates', label: 'Task Templates' },
];

const NAV: AdminNavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview & Analytics', end: true },
  { to: '/admin/directory', icon: Contact, label: 'Directory', end: false },
  { to: '/admin/org-structure', icon: Network, label: 'Org Structure', end: false },
  { to: '/admin/scheduled-checklists', icon: Repeat, label: 'Checklists', end: false, children: CHECKLIST_CHILDREN },
  { to: '/admin/tickets', icon: TicketCheck, label: 'Tickets', end: false },
  { to: '/tasks/team', icon: ClipboardList, label: 'Team Delegations', end: false },
  { to: '/admin/reports', icon: FileDown, label: 'Reports', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
];

// The sidebar is intentionally a fixed navy "chrome" — like the reference layout's colored rail —
// rather than a theme-reactive surface, so these classes have no dark: variants of their own.
const NAV_LINK_BASE =
  "group relative flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]";
const NAV_LINK_ACTIVE = "bg-white text-primary-700 shadow-sm";
const NAV_LINK_INACTIVE = "text-white/65 hover:bg-white/10 hover:text-white";
const NAV_ICON_ACTIVE = "text-primary-700";
const NAV_ICON_INACTIVE = "text-white/50 group-hover:text-white/80";
const LOGOUT_BUTTON = "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/65 hover:bg-white/10 hover:text-white transition-all duration-200 cursor-pointer";
const CHILD_LINK_BASE =
  "relative flex items-center min-w-0 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
const CHILD_LINK_ACTIVE = "bg-white/15 text-white";
const CHILD_LINK_INACTIVE = "text-white/55 hover:bg-white/10 hover:text-white/90";

export const AdminLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );

  // Sections with children start expanded so their sub-pages are visible in the sidebar right
  // away, without an extra click to discover what's inside.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(NAV.filter((item) => item.children?.length).map((item) => item.to))
  );
  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // Flattened so a child route (e.g. Checklist Compliance) resolves to its own specific label
  // rather than the parent group's generic one; longest matching `to` wins.
  const flatNavEntries = NAV.flatMap((item) =>
    item.children?.length
      ? item.children.map((child) => ({ to: child.to, label: child.label, end: false }))
      : [{ to: item.to, label: item.label, end: item.end }]
  );
  const currentNav = flatNavEntries
    .filter((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  const breadcrumbs = getAdminBreadcrumbs(location.pathname);

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Shared by both the mobile drawer and desktop rail so the expand/collapse behavior only needs
  // to be implemented once. `isDrawer` controls label visibility: the mobile drawer always shows
  // full labels, the desktop rail only when expanded (`sidebarOpen`).
  const renderNavItem = ({ to, icon: Icon, label, end, children }: AdminNavItem, isDrawer: boolean) => {
    const hasChildren = !!children?.length;
    const showLabel = isDrawer || sidebarOpen;
    const isExpanded = expandedKeys.has(to);
    const hasActiveChild = children?.some((child) => location.pathname.startsWith(child.to)) ?? false;

    return (
      <div key={to}>
        <div className="flex items-center gap-1">
          <NavLink
            to={to}
            end={end}
            onClick={handleNavClick}
            className={({ isActive }) => cn(
              NAV_LINK_BASE,
              !isDrawer && "focus-visible:ring-offset-1 focus-visible:ring-offset-primary-700",
              !isDrawer && !sidebarOpen && "justify-center px-0",
              (isActive || hasActiveChild) ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE
            )}
            title={!showLabel ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "w-[17px] h-[17px] shrink-0 transition-all duration-300 group-hover:scale-110",
                    (isActive || hasActiveChild) ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE
                  )}
                  strokeWidth={(isActive || hasActiveChild) ? 2 : 1.75}
                />
                <span className={cn("truncate transition-opacity duration-300", !showLabel && "hidden opacity-0")}>
                  {label}
                </span>

                {/* Active Indicator Pip (desktop rail, collapsed only) */}
                {!isDrawer && !sidebarOpen && (isActive || hasActiveChild) && (
                  <span className="hidden md:block absolute left-1 w-1 h-1/2 bg-white rounded-full" />
                )}
              </>
            )}
          </NavLink>

          {hasChildren && showLabel && (
            <button
              type="button"
              onClick={() => toggleExpanded(to)}
              aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
              aria-expanded={isExpanded}
              className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ChevronDown
                size={15}
                strokeWidth={2.5}
                className={cn("transition-transform duration-300 ease-out", isExpanded ? "rotate-180 text-white" : "rotate-0 text-white/60")}
              />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {hasChildren && showLabel && isExpanded && (
            <motion.div
              key="submenu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-0.5 mt-1 mb-1.5 ml-[19px] pl-3 border-l border-white/10">
                {children!.map((child) => {
                  const isChildActive = location.pathname === child.to;
                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={handleNavClick}
                      className={cn(CHILD_LINK_BASE, isChildActive ? CHILD_LINK_ACTIVE : CHILD_LINK_INACTIVE)}
                    >
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
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
            {NAV.map((item) => renderNavItem(item, true))}
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
            {NAV.map((item) => renderNavItem(item, false))}
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

            {/* Breadcrumbs — always rooted at "Dashboard" so every admin page has a one-click way
                back to the regular user dashboard, per the section-level trail in adminBreadcrumbs.ts */}
            {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}

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
