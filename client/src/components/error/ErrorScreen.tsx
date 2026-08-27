import { useNavigate } from 'react-router';
import { Home, RefreshCcw, AlertTriangle, SearchX, type LucideIcon } from 'lucide-react';
import { Button } from '../button';
import { OrbitDecoration } from '../orbitDecoration';

interface ErrorScreenProps {
  code?: string | number;
  title: string;
  message?: string;
  onRetry?: () => void;
}

// 404s get a distinct search-themed icon/tone from every other error, which reads as a generic
// "something broke" state — same danger tint used for error banners elsewhere in the app.
const iconFor = (code?: string | number): { Icon: LucideIcon; tone: 'primary' | 'danger' } =>
  code === 404 ? { Icon: SearchX, tone: 'primary' } : { Icon: AlertTriangle, tone: 'danger' };

export const ErrorScreen = ({ code, title, message, onRetry }: ErrorScreenProps) => {
  const navigate = useNavigate();
  const { Icon, tone } = iconFor(code);

  return (
    <div
      className="flex min-h-svh items-center justify-center p-4 relative overflow-hidden isolate"
      style={{ background: 'var(--bg-body)' }}
    >
      <OrbitDecoration corner="top-left" tone={tone === 'danger' ? 'coral' : 'primary'} className="opacity-70" />
      <OrbitDecoration corner="bottom-right" tone="primary" className="opacity-70" />
      <span className="absolute top-1/3 right-16 size-40 rounded-full bg-primary-300/10 blur-2xl pointer-events-none" aria-hidden="true" />

      <div
        className="group relative z-10 w-full max-w-md text-center flex flex-col items-center gap-5 p-8 sm:p-10 rounded-2xl border shadow-xl hover:shadow-2xl transition-shadow duration-300 animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
        }}
      >
        <div
          className={`relative flex items-center justify-center size-16 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${
            tone === 'danger'
              ? 'bg-danger/10 ring-1 ring-danger/20 dark:bg-danger/15'
              : 'bg-primary-50 ring-1 ring-primary-200/60 dark:bg-primary-500/10 dark:ring-primary-800/50'
          }`}
        >
          {/* A slow pulse behind the icon so the card reads as "alive" rather than a static error dump. */}
          <span className={`absolute inset-0 rounded-2xl animate-pulse ${tone === 'danger' ? 'bg-danger/10' : 'bg-primary-400/10'}`} aria-hidden="true" />
          <Icon size={28} strokeWidth={2} className={tone === 'danger' ? 'text-danger' : 'text-primary-600 dark:text-primary-400'} />
        </div>

        {code && (
          <span className="text-5xl sm:text-6xl font-display font-bold text-text tracking-tight -mt-1">
            {code}
          </span>
        )}

        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-display font-bold text-text">{title}</h1>
          {message && (
            <p className="text-sm text-text-muted font-display max-w-sm">{message}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {onRetry && (
            <Button variant="outline" size="sm" className="group/retry gap-1.5" onClick={onRetry}>
              <RefreshCcw size={14} className="transition-transform duration-500 group-hover/retry:rotate-180" />
              Try again
            </Button>
          )}
          <Button variant="primary" size="sm" className="group/home gap-1.5" onClick={() => navigate('/')}>
            <Home size={14} className="transition-transform duration-200 group-hover/home:-translate-y-0.5" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
