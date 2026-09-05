import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { FolderKanban, Calendar, ClipboardCheck } from 'lucide-react';
import { ComingSoon } from './components/comingSoon';
import { useAuth } from './context/AuthContext';
import { LoginForm } from './features/auth/LoginForm';
import { ForgotPasswordForm } from './features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './features/auth/ResetPasswordForm';
import { Dashboard } from './features/dashboard';
import { PublicLayout } from './components/layout';
import { useTicketSocket } from './features/tickets/useTicketSocket';
import { useTaskSocket } from './features/tasks/useTaskSocket';
import { useNotificationSocket } from './features/notifications/useNotificationSocket';
import { MyErrorBoundary, NotFoundPage, MaintenancePage } from './components/error';
import { RouteFallback } from './components/skeleton';

// Both maintenance flags now live in lib/maintenance.ts — this whole-app one, and the per-page
// list the Dashboard shell checks. Reading the env var in two places would let them drift.
import { MAINTENANCE_ALL } from './lib/maintenance';

// Lazy like every other route. It was the one eager import among them, so its whole admin shell
// — nav tree, header, breadcrumbs — was downloaded by every user on first paint, including the
// large majority who are not ADMIN and can never reach a route inside it.
const AdminLayout = lazy(() => import('./features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const HomePage = lazy(() => import('./features/dashboard/HomePage').then(m => ({ default: m.HomePage })));
const TicketList = lazy(() => import('./features/tickets/TicketList').then(m => ({ default: m.TicketList})));
const TaskList = lazy(() => import('./features/tasks/TaskList').then(m => ({ default: m.TaskList })));
const TodoPage = lazy(() => import('./features/todo/TodoPage').then(m => ({ default: m.TodoPage })));
const EventList = lazy(() => import('./features/events/EventList').then(m => ({ default: m.EventList })));
const OrgOverview = lazy(() => import('./features/admin/analytics').then(m => ({ default: m.OrgOverview })));
const VerificationQueue = lazy(() => import('./features/verification').then(m => ({ default: m.VerificationQueue })));
const AdminTaskList = lazy(() => import('./features/admin/AdminTaskList').then(m => ({ default: m.AdminTaskList })));
const TeamOverviewPage = lazy(() => import('./features/team/TeamOverviewPage').then(m => ({ default: m.TeamOverviewPage })));
const SettingsLayout = lazy(() => import('./features/settings/SettingsLayout').then(m => ({ default: m.SettingsLayout })));
const CategoryList = lazy(() => import('./features/settings/CategoryList').then(m => ({ default: m.CategoryList })));
const DirectoryPage = lazy(() => import('./features/admin/directory').then(m => ({ default: m.DirectoryPage })));
const OrgStructurePage = lazy(() => import('./features/admin/orgStructure').then(m => ({ default: m.OrgStructurePage })));
const ReportsPage = lazy(() => import('./features/reports').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./features/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ChecklistTemplateList = lazy(() => import('./features/admin/checklistTemplate').then(m => ({ default: m.ChecklistTemplateList })));
const MyChecklists = lazy(() => import('./features/checklist').then(m => ({ default: m.MyChecklists })));
const ChecklistInstanceDetail = lazy(() => import('./features/checklist').then(m => ({ default: m.ChecklistInstanceDetail })));
const ChecklistTemplatesGrid = lazy(() => import('./features/checklist').then(m => ({ default: m.ChecklistTemplatesGrid })));
const ChecklistDefinitionDetail = lazy(() => import('./features/checklist').then(m => ({ default: m.ChecklistDefinitionDetail })));
const ChecklistBuilder = lazy(() => import('./features/checklist').then(m => ({ default: m.ChecklistBuilder })));
const ChecklistComplianceBoard = lazy(() => import('./features/checklist').then(m => ({ default: m.ChecklistComplianceBoard })));

const ProtectedRoute = () => {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const AuthRoute = () => {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <Outlet />;
};


const AdminRoute = () => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return user?.role === 'ADMIN' || user?.role === 'PC' ? <Outlet /> : <Navigate to="/" replace />;
};

const PCRoute = () => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return user?.role === 'PC' || user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
};

const AnalyticsRoute = () => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return user?.role === 'MANAGER' || user?.role === 'SENIOR' ? <Outlet /> : <Navigate to="/" replace />;
};

const ChecklistTemplatesRoute = () => {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return (
      <ComingSoon
        icon={ClipboardCheck}
        title="Checklist Templates"
        description="Checklist template management is being rolled out gradually and isn't available for your role yet."
        features={['Reusable delegation templates', 'Recurring schedule builder', 'Step-by-step template editor']}
      />
    );
  }
  return <ChecklistTemplateList />;
};

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <MyErrorBoundary />,
    children: [
      {
        element: <AuthRoute />,
        children: [
          { path: '/login', element: <LoginForm /> },
          { path: '/forgot-password', element: <ForgotPasswordForm /> },
          { path: '/reset-password', element: <ResetPasswordForm /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <MyErrorBoundary />,
    children: [
      {
        element: <Dashboard />,
        children: [
          { path: '/', element: <HomePage /> },
          {
            path: '/projects',
            element: (
              <ComingSoon
                icon={FolderKanban}
                title="Projects"
                description="A dedicated space to plan, track, and collaborate on multi-step work — beyond single delegations and tickets."
                features={['Milestones & timelines', 'Cross-team task grouping', 'Progress dashboards']}
              />
            ),
          },
          {
            path: '/calendar',
            element: (
              <ComingSoon
                icon={Calendar}
                title="Calendar"
                description="A unified calendar view of every delegation, ticket, and checklist due date across your team."
                features={['Day, week & month views', 'Drag-to-reschedule due dates', 'Team availability at a glance']}
              />
            ),
          },
          { 
            path: '/settings', 
            element: <SettingsLayout/>, 
            children : [
              { index : true, element : <Navigate to="/settings/categories" replace />},
              { path : "categories", element : <CategoryList/>}

          ] },
          { path: '/tickets', element: <TicketList /> },
          { path: '/tasks', element: <TaskList /> },
          { path: '/todo', element: <TodoPage /> },
          { path: '/events', element: <EventList /> },
          { path: '/checklists', element: <MyChecklists /> },
          { path: '/checklists/:instanceId', element: <ChecklistInstanceDetail /> },
          { path: '/dashboard', element: <Navigate to="/" replace /> },
          {
            element: <AnalyticsRoute />,
            children: [
              { path: '/analytics', element: <OrgOverview /> },
            ],
          },
          {
            element: <PCRoute />,
            children: [
              { path: '/verify', element: <VerificationQueue /> },
              // Org-wide task browser (department/person/day/status filters) — PC and ADMIN
              // both need this, so it lives here instead of under AdminRoute/AdminLayout,
              // which is gated to ADMIN only.
              { path: '/tasks/team', element: <AdminTaskList /> },
              // Department -> person -> checklist drill-down — same PC/ADMIN audience as above.
              { path: '/team', element: <TeamOverviewPage /> },
            ],
          },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            // Its own boundary: App has no Suspense of its own — every other lazy route resolves
            // inside Dashboard's or AdminLayout's — so a lazy layout route needs one above it.
            element: (
              <Suspense fallback={<RouteFallback />}>
                <AdminLayout />
              </Suspense>
            ),
            children: [
              { path: '/admin', element: <OrgOverview /> },
              { path: '/admin/analytics', element: <Navigate to="/admin" replace /> },    
              { path: '/admin/reports/tasks', element: <Navigate to="/tasks/team" replace /> },
              { path: '/admin/directory', element: <DirectoryPage /> },
              { path: '/admin/users', element: <Navigate to="/admin/directory" replace /> },
              { path: '/admin/departments', element: <Navigate to="/admin/directory" replace /> },
              { path: '/admin/stores', element: <Navigate to="/admin/directory" replace /> },
              { path: '/admin/org-structure', element: <OrgStructurePage /> },
              { path: '/admin/checklist-templates', element: <ChecklistTemplatesRoute /> },
              { path: '/admin/scheduled-checklists', element: <ChecklistTemplatesGrid /> },
              { path: '/admin/checklist-compliance', element: <ChecklistComplianceBoard /> },
              { path: '/admin/scheduled-checklists/builder', element: <ChecklistBuilder /> },
              { path: '/admin/scheduled-checklists/builder/:definitionId', element: <ChecklistBuilder /> },
              { path: '/admin/scheduled-checklists/:definitionId', element: <ChecklistDefinitionDetail /> },
              { path: '/admin/tickets', element: <TicketList /> },
              { path: '/admin/reports', element: <ReportsPage /> },
              { path: '/admin/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  useTicketSocket();
  useTaskSocket();
  useNotificationSocket();

  if (MAINTENANCE_ALL) return <MaintenancePage />;

  return <RouterProvider router={router} />;
}
  