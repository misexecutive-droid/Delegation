import { CalendarClock, Flag, Clock, ArrowDownAZ, type LucideIcon } from 'lucide-react';
import type { Ticket } from '../../../api/ticket';

export type TicketSortKey = 'tatDueAt' | 'priority' | 'createdAt' | 'title';

export const SORT_LABEL: Record<TicketSortKey, string> = {
  tatDueAt: 'Due date',
  priority: 'Priority',
  createdAt: 'Created date',
  title: 'Title',
};

export const SORT_ICON: Record<TicketSortKey, LucideIcon> = {
  tatDueAt: CalendarClock,
  priority: Flag,
  createdAt: Clock,
  title: ArrowDownAZ,
};

const PRIORITY_RANK: Record<Ticket['priority'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};


export const SORT_COMPARATORS: Record<TicketSortKey, (a: Ticket, b: Ticket) => number> = {
  tatDueAt: (a, b) => {
    if (!a.tatDueAt && !b.tatDueAt) return 0;
    if (!a.tatDueAt) return 1;
    if (!b.tatDueAt) return -1;
    return new Date(a.tatDueAt).getTime() - new Date(b.tatDueAt).getTime();
  },
  priority: (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
  createdAt: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  title: (a, b) => a.title.localeCompare(b.title),
};
