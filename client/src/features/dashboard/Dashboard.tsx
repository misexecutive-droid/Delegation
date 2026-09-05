import { Suspense, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Construction } from 'lucide-react';
import { Header, Footer, Sidebar, BottomNav } from '../../components/layout';
import { RouteFallback } from '../../components/skeleton';
import { PullToRefresh } from '../../components/pullToRefresh';
import { PageMaintenance } from '../../components/error/PageMaintenance';
import { isPathUnderMaintenance, maintenancePageLabel } from '../../lib/maintenance';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Checked once here rather than per route: every page in the app renders through this Outlet, so
  // one guard covers all of them and no route definition has to know maintenance exists.
  // ADMINs are deliberately exempt — whoever flipped the page into maintenance is the person who
  // needs to load it to check their own work. They get the banner below instead of the block.
  const isAdmin = user?.role === 'ADMIN';
  const maintenanceMatch = isPathUnderMaintenance(location.pathname);
  const pageUnderMaintenance = maintenanceMatch && !isAdmin;

  const handleRefresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);

  return (
    <div
      className="flex flex-col h-svh w-full overflow-hidden text-text transition-colors duration-300"
      style={{ background: 'var(--color-background)' }}
    >
      <Header onToggleSidebar={() => setSidebarOpen(v => !v)} />

      <div className="flex flex-1 min-h-0 relative z-0">
        <Sidebar
          isOpen={sidebarOpen}
          user={user}
          logout={logout}
          onNavigate={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarOpen((v) => !v)}
        />

        {/* Three fixed, heavily-blurred colour blobs (two navy, one gold) used to sit behind every
            page here. At blur-[120px] across 45rem they didn't read as distinct shapes — they just
            washed the whole viewport a hazy blue-gold, so no page ever actually sat on white.
            Removed in favour of the plain surface: content now defines itself with borders, which
            is how the rest of the app is built. No background needed here — the shell root above
            already paints `var(--color-background)`, so this shows white in light and the deep
            navy in dark. */}
        <main className="flex-1 min-w-0 relative">
          <PullToRefresh onRefresh={handleRefresh} className="relative z-10 h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            <div className="p-4 sm:p-6 lg:p-8 xl:p-10 pb-44 md:pb-8 max-w-(--container-width) mx-auto w-full min-h-full flex flex-col">
              {/* Only an ADMIN ever sees this: they're being shown a page that everyone else is
                  currently blocked from, so the page has to say so — otherwise it's invisible that
                  maintenance is even on, and it's easy to leave a module switched off. */}
              {maintenanceMatch && isAdmin && (
                <div
                  role="status"
                  className="flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl border border-warning/30 bg-warning/10 text-xs font-display font-medium text-text-secondary"
                >
                  <Construction size={15} className="text-warning shrink-0" />
                  <span>
                    This page is under maintenance for everyone else — you can see it because you&rsquo;re an admin.
                  </span>
                </div>
              )}
              {/* Keying on the pathname remounts this node per navigation, which replays the
                  entrance animation — the CSS equivalent of what AnimatePresence was doing on the
                  way in. The outgoing page's *exit* animation is gone: keeping a page mounted
                  after it's been replaced is orchestration only JS can do. It ran in sync mode
                  (deliberately, so enter and exit overlapped), so the exit was largely hidden
                  behind the incoming page anyway.
                  This also fixes what the old comment here described: framer-motion runs off
                  JavaScript, so index.css's prefers-reduced-motion block never reached this
                  transition and the blur-and-slide fired regardless of the user's setting. An
                  `animate-in` utility is covered by that block, so the setting now applies with
                  no `useReducedMotion` hook to keep in sync. */}
              <div
                key={location.pathname}
                className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-350 ease-out"
              >
                <Suspense fallback={<RouteFallback />}>
                  {pageUnderMaintenance ? <PageMaintenance pageName={maintenancePageLabel(location.pathname)} /> : <Outlet />}
                </Suspense>
              </div>
            </div>
          </PullToRefresh>

        </main>
      </div>
      <div className="relative z-20 hidden md:block">
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
};