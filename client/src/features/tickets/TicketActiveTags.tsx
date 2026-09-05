import { X } from 'lucide-react';
import type { useTicketOrganizer } from './useTicketOrganizer';
import type { Ticket } from '../../api/ticket';

interface TicketActiveTagsProps {
  organizer: ReturnType<typeof useTicketOrganizer>;
  allTickets: Ticket[];
}

export const TicketActiveTags = ({ organizer, allTickets }: TicketActiveTagsProps) => {
  const { quickFilter } = organizer;

  return (
    <div className="flex flex-col gap-2">
      {quickFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-display font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            Showing: {quickFilter.charAt(0).toUpperCase() + quickFilter.slice(1)}
            <button onClick={() => organizer.toggleQuickFilter(quickFilter)} className="p-0.5 rounded hover:bg-primary-100">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {organizer.assigneeIdFilter && (
        <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium w-fit">
          Showing tickets for {allTickets[0]?.assignee?.firstName ?? 'this person'}
          <button
            onClick={() => organizer.setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('assigneeIds'); return p; })}
            className="p-0.5 rounded-full hover:bg-primary-100"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
};