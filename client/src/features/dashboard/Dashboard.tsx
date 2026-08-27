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
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 flex items-center justify-center">
            <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full bg-primary-500/10 dark:bg-primary-400/5 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full bg-primary-400/10 dark:bg-primary-500/5 blur-[120px]" />
            <div className="absolute top-[30%] left-[15%] w-[30rem] h-[30rem] rounded-full bg-coral-500/5 dark:bg-coral-400/5 blur-[100px]" />
          </div>


          <PullToRefresh onRefresh={handleRefresh} className="relative z-10 h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            <div className="p-4 sm:p-6 lg:p-8 xl:p-10 pb-44 md:pb-8 max-w-[1600px] mx-auto w-full min-h-full flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1]
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
      <div className="relative z-20 hidden md:block">
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
};