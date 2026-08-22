import { Suspense, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Header, Footer, Sidebar, BottomNav } from '../../components/layout';
import { RouteFallback } from '../../components/skeleton';
import { PullToRefresh } from '../../components/pullToRefresh';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generic shell-level refresh: re-fetches whatever queries the current page actually depends
  // on, rather than each page having to wire up its own pull-to-refresh handler.
  const handleRefresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);

  return (
    <div 
      className="flex flex-col h-svh w-full overflow-hidden text-text transition-colors duration-300" 
      style={{ background: 'var(--bg-body)' }}
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

        <main className="flex-1 min-w-0 relative">

          {/* Premium Ambient Mesh Gradient Background
              Added dark mode variants to ensure it looks soft and clean in both themes */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 flex items-center justify-center">
            <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full bg-primary-500/10 dark:bg-primary-400/5 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full bg-primary-400/10 dark:bg-primary-500/5 blur-[120px]" />
            <div className="absolute top-[30%] left-[15%] w-[30rem] h-[30rem] rounded-full bg-coral-500/5 dark:bg-coral-400/5 blur-[100px]" />
          </div>

          {/* Pull-to-refresh owns the scroll here (touch-only gesture — desktop pointers never
              fire touchstart, so this is a no-op with a mouse) and re-fetches via the shared
              query client, so it works generically across whichever page is mounted below. */}
          <PullToRefresh onRefresh={handleRefresh} className="relative z-10 h-full overflow-y-auto overscroll-contain">
            {/* Main Content Area
                Reduced base padding on mobile to p-4 to maximize screen real estate, scaling up on sm/lg screens.
                pb-44 (not just enough to clear BottomNav) also clears any page's mobile Fab, which
                floats another ~56px above the nav — otherwise the last scrolled item sits right
                under the floating button instead of fully above it. */}
            <div className="p-4 sm:p-6 lg:p-8 xl:p-10 pb-44 md:pb-8 max-w-[1600px] mx-auto w-full min-h-full flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  // Replaced the scale effect with a subtle blur for a more premium, native-app feel
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1] // Custom smooth decelerating easing
                  }}
                  className="flex-1 flex flex-col h-full"
                >
                  <Suspense fallback={<RouteFallback />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </PullToRefresh>

        </main>
      </div>

      {/* Desktop-only footer — mobile gets the thumb-reachable BottomNav below instead, so the
          two never stack/overlap on a phone screen. */}
      <div className="relative z-20 hidden md:block">
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
};