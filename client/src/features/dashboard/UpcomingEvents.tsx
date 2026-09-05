import { Link } from 'react-router';
import { CalendarClock } from 'lucide-react';
import { Skeleton } from '../../components';
import { EVENT_TYPE_COLORS, EVENT_TYPE_ICON_TINTS, EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '../events/eventDisplay';
import type { Event } from '../../api/events';

interface UpcomingEventsProps {
  events: Event[];
  isPending: boolean;
}

export const UpcomingEvents = ({ events, isPending }: UpcomingEventsProps) => (
  <section id="upcoming-events" aria-labelledby="upcoming-events-heading" className="relative group rounded-2xl border border-border/60 dark:border-white/[0.06] bg-surface flex flex-col hover:border-primary-500/30 transition-colors duration-500 overflow-hidden">

    {/* Decorative Background Glow */}

    {/* Header */}
    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 border-b border-border/40 bg-surface/50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm flex items-center justify-center">
          <CalendarClock size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h2 id="upcoming-events-heading" className="text-base sm:text-lg font-display font-bold text-text tracking-tight">Upcoming Events</h2>
          <p className="text-[11px] sm:text-xs font-medium text-text-muted mt-0.5">Deadlines, announcements, and broadcasts</p>
        </div>
      </div>

      <Link
        to="/events"
        className="px-3 py-1.5 rounded-md text-xs font-display font-medium text-text-muted hover:text-primary-600 hover:bg-surface-hover transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      >
        View all
      </Link>
    </div>

    {/* Content Area */}
    <div className="relative z-10 flex flex-col p-2">
      {isPending ? (
        // Skeleton State
        <div className="flex flex-col gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-3/4 max-w-sm rounded" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="p-3 rounded-full bg-surface-hover border border-border/50">
            <CalendarClock size={20} className="text-text-muted" />
          </div>
          <p className="text-sm font-display text-text-muted font-medium">No upcoming deadlines, announcements, or broadcasts.</p>
        </div>
      ) : (
        // Populated Feed
        <div className="flex flex-col gap-1">
          {events.map(e => {
            const Icon = EVENT_TYPE_ICONS[e.type];
            return (
              <Link
                key={e.id}
                to="/events"
                className="group/item flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 rounded-lg hover:bg-surface-hover/60 active:bg-surface-hover active:scale-[0.98] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div aria-hidden="true" className={`flex items-center justify-center shrink-0 ${EVENT_TYPE_ICON_TINTS[e.type]}`}>
                    <Icon size={14} />
                  </div>

                  {/* Title */}
                  <p className="text-sm font-display font-medium text-text truncate">
                    {e.title}
                  </p>
                </div>

                {/* Badges and Metadata */}
                <div className="flex items-center gap-4 pl-11 sm:pl-0 shrink-0">
                  <span className={`inline-flex items-center justify-center text-[11px] font-display font-medium px-2.5 py-1 rounded-full ${EVENT_TYPE_COLORS[e.type]}`}>
                    {EVENT_TYPE_LABELS[e.type]}
                  </span>

                  <span className="text-xs text-text-muted font-display font-medium min-w-[50px] text-right">
                    {new Date(e.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  </section>
);