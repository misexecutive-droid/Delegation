import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import { ConfirmDialogProvider } from "./components/confirmDialog"


const queryClient = new QueryClient();

if (import.meta.env.DEV) {
  document.body.classList.add('debug-screens');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* QueryClientProvider now wraps AuthProvider (was the other way round) so AuthContext's
          logout() can reach useQueryClient() and purge every cached query on sign-out — otherwise
          a lower-privileged account signed into afterward could see the previous session's
          already-cached data (another user's tasks/tickets) until each query happened to refetch. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ConfirmDialogProvider>
              <App />
            </ConfirmDialogProvider>

            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);