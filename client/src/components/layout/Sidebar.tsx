import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  Settings,
  LogOut,
  TicketCheck,
  ShieldCheck,
  ClipboardCheck,
  ShieldQuestion,
  CalendarClock,
  ChevronDown,
  Building2,
  BarChart3,
  ListTodo,
  X,
} from 'lucide-react';

interface NavChild {
  to: string;
  label: string;
  soon?: boolean;
}

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  children?: NavChild[];
}

const CHECKLIST_CHILDREN: NavChild[] = [
  { to: '/checklists', label: "Today's runs" },
];

const CHECKLIST_ADMIN_CHILDREN: NavChild[] = [
  { to: '/admin/checklist-templates', label: 'Delegation Templates' },
  { to: '/admin/scheduled-checklists', label: 'Templates' },
  { to: '/admin/scheduled-checklists/builder', label: 'Builder' },
];

const TASK_CHILDREN: NavChild[] = [
  { to: '/tasks?mine=1', label: 'My Delegations' },
  { to: '/tasks/draft', label: 'Draft Delegations', soon: true },
  { to: '/tasks/archived', label: 'Archived', soon: true },
];

const PENDING_APPROVALS_CHILD: NavChild = { to: '/tasks?status=pending_verification', label: 'Pending Approvals' };
const SMART_DELEGATIONS_CHILD: NavChild = { to: '/tasks?category=delegation', label: 'Smart Delegations' };
const TASK_ADMIN_CHILDREN: NavChild[] = [
  { to: '/tasks/team', label: 'Team Delegations' },
];

const NAV: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Delegation', children: TASK_CHILDREN },
  { to: '/tickets', icon: TicketCheck, label: 'Tickets' },
  { to: '/todo', icon: ListTodo, label: 'To-Do' },
  { to: '/events', icon: CalendarClock, label: 'Events' },
  { to: '/checklists', icon: ClipboardCheck, label: 'Checklists', children: CHECKLIST_CHILDREN },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const isChildActive = (child: NavChild, location: { pathname: string; search: string }) =>
  child.to.includes('?')
    ? `${location.pathname}${location.search}` === child.to
    : location.pathname === child.to;

interface SidebarProps {
  isOpen: boolean;
  user: { id: string; name: string; email: string; role?: string } | null;
  logout: () => void;
  onNavigate?: () => void;
}

export const Sidebar = ({ isOpen, user, logout, onNavigate }: SidebarProps) => {
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const isPC = user?.role === 'PC';
  const isManager = user?.role === 'MANAGER';
  const isSenior = user?.role === 'SENIOR';
  const seesSmartDelegations = isAdmin || isPC || isManager;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(NAV.filter((item) => item.children?.length).map((item) => item.to)),
  );

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navItems: NavItem[] = NAV.map((item) => {
    if (item.label === 'Checklists' && (isAdmin || isPC)) {
      return { ...item, children: [...CHECKLIST_CHILDREN, ...CHECKLIST_ADMIN_CHILDREN] };
    }
    if (item.label === 'Delegation') {
      const [myDelegations, ...restTaskChildren] = TASK_CHILDREN;
      return {
        ...item,
        children: [
          myDelegations,
          ...(seesSmartDelegations ? [SMART_DELEGATIONS_CHILD] : []),
          ...(isPC ? [PENDING_APPROVALS_CHILD] : []),
          ...restTaskChildren,
          ...(isPC ? TASK_ADMIN_CHILDREN : []),
        ],
      };
    }
    return item;
  });

  const adminNavItems: NavItem[] = [
    ...(isManager || isSenior ? [{ to: '/analytics', icon: BarChart3, label: 'Analytics' }] : []),
    ...(user?.role === 'PC' || user?.role === 'ADMIN'
      ? [{ to: '/verify', icon: ShieldQuestion, label: 'Verification Queue' }]
      : []),
    ...(isAdmin || isPC ? [{ to: '/team', icon: Building2, label: 'Team Overview' }] : []),
    ...(isAdmin || isPC ? [{ to: '/admin/directory', icon: ShieldCheck, label: 'Admin' }] : []),
  ];

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onNavigate?.();
    }
  };

  const renderNavItem = ({ to, icon: Icon, label, children }: NavItem, isDrawer: boolean) => {
    const hasActiveChild = children?.some((child) => !child.soon && isChildActive(child, location)) ?? false;
    const hasChildren = !!children?.length;
    // Was `isDrawer || expandedKeys.has(to)` — that forced every group open inside the mobile
    // drawer no matter what, so the chevron rendered there but clicking it never visibly did
    // anything. expandedKeys already defaults every group to open (see the useState above), so
    // dropping the isDrawer override just makes the arrow actually toggle in both contexts.
    const isExpanded = expandedKeys.has(to);
    const showLabel = isDrawer || isOpen;

    return (
      <div key={to}>
        <div className="flex items-center gap-1.5">
          <NavLink
            to={to}
            end={to === '/'}
            title={!showLabel ? label : undefined}
            onClick={handleNavClick}
            className={({ isActive }) =>
              [
                'group/link flex flex-1 min-w-0 items-center rounded-xl text-[13px] transition-all duration-200 ease-out',
                'px-3 py-2.5',
                showLabel ? 'justify-start' : 'md:justify-center md:px-0',
                isActive || hasActiveChild
                  ? 'bg-primary-50/80 text-primary-700 font-bold shadow-sm ring-1 ring-primary-200/50 dark:bg-primary-900/20 dark:text-primary-300 dark:ring-primary-800/50'
                  : 'text-text-secondary font-semibold hover:bg-surface-hover hover:text-text',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive || hasActiveChild ? 2.5 : 2}
                  className={[
                    'shrink-0 transition-transform duration-300',
                    isActive || hasActiveChild 
                      ? 'text-primary-600 dark:text-primary-400 scale-105' 
                      : 'text-text-muted group-hover/link:text-text-secondary group-hover/link:scale-105',
                  ].join(' ')}
                />
                <span
                  className={[
                    'truncate leading-none transition-all duration-300 ease-in-out',
                    showLabel ? 'max-w-[10rem] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0',
                  ].join(' ')}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>

          {hasChildren && showLabel && (
            <button
              type="button"
              onClick={() => toggleExpanded(to)}
              aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
              aria-expanded={isExpanded}
              className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className={`transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180 text-text' : 'rotate-0'}`}
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
              <div className="flex flex-col gap-1 mt-1 mb-2 ml-4 pl-4 border-l-2 border-border/50">
                {children!.map((child) => {
                  if (child.soon) {
                    return (
                      <span
                        key={child.to}
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted/70 cursor-not-allowed select-none"
                      >
                        {child.label}
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-hover/80 border border-border/60 text-text-muted">
                          Soon
                        </span>
                      </span>
                    );
                  }

                  const isActiveChild = isChildActive(child, location);

                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={handleNavClick}
                      className={[
                        'relative rounded-lg px-3 py-1.5 text-[12.5px] transition-all duration-200',
                        isActiveChild
                          ? 'bg-primary-50/50 text-primary-700 font-bold dark:bg-primary-500/10 dark:text-primary-300'
                          : 'text-text-secondary font-medium hover:bg-surface-hover hover:text-text',
                      ].join(' ')}
                    >
                      {/* Subtle active indicator dot */}
                      {isActiveChild && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 -ml-[19px] size-1.5 rounded-full bg-primary-500 ring-4 ring-surface" />
                      )}
                      {child.label}
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

  const renderContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full w-full justify-between">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 mb-4 shrink-0">
          <p
            className={[
              'text-[10px] font-bold text-text-muted uppercase tracking-widest',
              'overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
              (isDrawer || isOpen) ? 'max-h-5 opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}
          >
            Workspace
          </p>
          {isDrawer && (
            <button
              type="button"
              onClick={onNavigate}
              className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              aria-label="Close menu"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          {navItems.map((item) => renderNavItem(item, isDrawer))}

          {adminNavItems.length > 0 && (
            <>
              <p
                className={[
                  'text-[10px] font-bold text-text-muted uppercase tracking-widest px-3',
                  'overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
                  (isDrawer || isOpen) ? 'max-h-5 opacity-100 mt-6 mb-3' : 'max-h-0 opacity-0 mt-3 mb-0',
                ].join(' ')}
              >
                Admin
              </p>
              {(!isDrawer && !isOpen) && <div className="border-t border-border/60 my-2 mx-1" aria-hidden="true" />}
              {adminNavItems.map((item) => renderNavItem(item, isDrawer))}
            </>
          )}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="shrink-0 pt-4 border-t border-border/50 mt-4">
        <div
          className={[
            'flex items-center p-2 rounded-xl border border-transparent transition-all duration-300',
            (isDrawer || isOpen) ? 'bg-surface-hover/50 border-border/40 shadow-sm' : 'md:justify-center hover:bg-surface-hover/50',
          ].join(' ')}
        >
          <div
            className="size-9 rounded-full bg-primary-600 shadow-sm flex items-center justify-center text-white text-xs font-bold shrink-0"
            title={user?.name}
          >
            {initials}
          </div>

          <div
            className={[
              'flex items-center gap-2 min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
              (isDrawer || isOpen) ? 'max-w-[12rem] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0',
            ].join(' ')}
          >
            <div className="flex-1 min-w-0 py-0.5">
              <p className="text-[13px] font-bold text-text truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] font-medium text-text-muted truncate leading-tight mt-0.5">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="size-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0 ml-1"
              aria-label="Log out"
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile Drawer — extra top padding (pt-8 instead of the shared py-5) clears the fixed
          Header bar above it, so "Workspace"/"Dashboard" don't read as glued to its icon row. */}
      <aside
        className={[
          'md:hidden fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[85vw] h-full flex flex-col px-4 pt-8 pb-5 shadow-2xl border-r border-border/50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        ].join(' ')}
        style={{ background: 'var(--color-surface, #1e293b)' }}
      >
        {renderContent(true)}
      </aside>

      {/* 3. Desktop Sidebar */}
      <aside
        className={[
          'hidden md:flex flex-col shrink-0 h-full border-r border-border/50 transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden py-5 relative z-20',
          isOpen ? 'w-[260px] px-4' : 'w-[72px] px-3',
        ].join(' ')}
        style={{ background: 'var(--color-surface)' }}
      >
        {renderContent(false)}
      </aside>
    </>
  );
};