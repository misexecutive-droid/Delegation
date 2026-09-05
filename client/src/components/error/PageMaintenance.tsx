import { Construction, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../button';

interface PageMaintenanceProps {
  /** Name of the page being worked on, e.g. "Delegation". */
  pageName?: string;
  message?: string;
  /** Optional human-readable ETA, e.g. "Back by 3:00 PM IST". */
  estimatedReturn?: string;
}

/**
 * The single-page counterpart to MaintenancePage.
 *
 * MaintenancePage is a `min-h-svh` takeover that deliberately stands alone — correct when the whole
 * app is down, wrong for one page: it would paint over the sidebar and nav and strand the user with
 * no way out of a section that isn't even broken. This renders *inside* the shell instead, so every
 * other module stays one click away, and it offers an explicit route back to the dashboard.
 */
export const PageMaintenance = ({
  pageName = 'This page',
  message = "We're updating it right now. It'll be back shortly — everything else is still available.",
  estimatedReturn,
}: PageMaintenanceProps) => {
  const navigate = useNavigate();

  return (
  <div className="flex flex-1 items-center justify-center py-12 sm:py-20">
    <div
      role="status"
      className="w-full max-w-md text-center flex flex-col items-center gap-5 p-8 sm:p-10 rounded-2xl border border-border/60 dark:border-white/[0.06] bg-surface animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400">
        <Construction size={28} strokeWidth={1.75} />
        {/* motion-safe so the pulsing ring respects a reduced-motion preference. */}
        <span className="absolute inset-0 rounded-2xl border border-primary-400/30 motion-safe:animate-ping" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg sm:text-xl font-display font-bold text-text">{pageName} is under maintenance</h1>
        <p className="text-sm text-text-muted font-display max-w-sm">{message}</p>
      </div>

      {estimatedReturn && (
        <span className="inline-flex items-center justify-center rounded-full border border-border/60 bg-surface-hover px-3 py-1 text-xs font-medium text-text-secondary">
          {estimatedReturn}
        </span>
      )}

      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        <Button variant="primary" size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
          <RefreshCcw size={14} />
          Try again
        </Button>
        {/* `Button` has no `asChild`, and an <a> nested in a <button> would be invalid markup
            anyway — navigating programmatically keeps it a single, correct control. */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/')}>
          <ArrowLeft size={14} />
          Back to dashboard
        </Button>
      </div>
    </div>
  </div>
  );
};
