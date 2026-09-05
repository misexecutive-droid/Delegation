import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, AlertCircle, Inbox, RotateCcw } from 'lucide-react';
import { Button, PageNav, Fab } from '../../components';
import { useAuth } from '@/context/AuthContext';
import { useDepartmentsQuery, useAssignableUsersQuery, useTicketsBoardQuery } from './hook';
import { TicketForm } from './TicketForm';
import { TicketDetail } from './TicketDetail';
import { TicketBoard } from './TicketBoard';
import { ExportDialog } from '../reports';
import { TicketListSkeleton } from './list/TicketListSkeleton';
import { TicketGroupedList } from './list/TicketGroupedList';
import { TicketQuickStats } from './list/TicketQuickStats';
import { useTicketOrganizer } from './useTicketOrganizer';
import { TicketSettingsMenu } from './TicketSettingsMenu';
import { TicketActiveTags } from './TicketActiveTags';
import type { Ticket } from '../../api/ticket';

export const TicketList = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: departments } = useDepartmentsQuery();
  const { data: assignableUsers } = useAssignableUsersQuery();
  const departmentNames = new Map((departments ?? []).map(d => [d.id, d.name]));

  // Read once, same as the deep-link's own `assigneeIdFilter` — fetching a second time with
  // organizer.assigneeIdFilter (derived only after organizer runs) meant the rendered list came
  // from an earlier, unfiltered fetch while the correctly-scoped fetch was thrown away.
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeIdFilter = searchParams.get('assigneeIds') ?? undefined;
  const { data: allTicketsData, isPending, isError } = useTicketsBoardQuery(true, assigneeIdFilter);
  const organizer = useTicketOrganizer(allTicketsData ?? [], user, departmentNames);

  // `/tickets?open=<id>` opens that ticket's detail sheet directly, then drops the param so it
  // doesn't reopen on every render. Mirrors TaskList's existing `?open=` handling — the Dashboard's
  // Recent Activity rows deep-link into both, and previously both kinds of row just dumped you on
  // the unfiltered list to go find the item you'd already clicked.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !allTicketsData) return;
    const match = allTicketsData.find((t) => t.id === openId);
    // Syncing from an external system (the URL, set by whatever navigated here) into local state,
    // not reacting to React state — and the param is stripped immediately after, so this fires
    // once per navigation rather than looping.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setSelectedTicket(match);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allTicketsData]);
  const isVerifier = user?.role === 'PC' || user?.role === 'ADMIN';
  const canExport = user?.role === 'ADMIN' || user?.role === 'PC';

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-(--container-width) transition-all duration-300">
      
      <div className="flex flex-col gap-4">
        {/* Same header treatment as Delegation: the visible title block is gone — you arrive from
            a nav item that already says Tickets, and the lead "Total" tile states the same count
            as a number you can click. The heading stays in the accessibility tree so the page
            still has one landmark to land on. */}
        <h1 className="sr-only">Tickets</h1>

        <TicketQuickStats
          counts={organizer.quickCounts}
          total={organizer.scopedTotal}
          active={organizer.quickFilter}
          onToggle={organizer.toggleQuickFilter}
          onClear={organizer.clearQuickFilter}
          isLoading={isPending}
        />

        {/* One controls band below the stats, matching Delegation: active filters on the left,
            the create action and Options on the right. */}
        <div className="flex items-center gap-3 flex-wrap">
          <TicketActiveTags organizer={organizer} allTickets={allTicketsData ?? []} />

          <div className="flex items-center gap-2.5 flex-wrap shrink-0 ml-auto">
            <Button variant="primary" size="sm" className="hidden rounded-full md:inline-flex gap-2" onClick={() => setShowForm(true)}>
              <span>Create Ticket</span>
            </Button>
            <TicketSettingsMenu
              isOpen={showOptions}
              setIsOpen={setShowOptions}
              organizer={organizer}
              departments={departments}
              assignableUsers={assignableUsers}
              canExport={canExport}
              onExport={() => setShowExport(true)}
            />
            <Fab actions={[{ key: 'create', label: 'Create Ticket', icon: Plus, onClick: () => setShowForm(true) }]} />
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      {isPending && <TicketListSkeleton />}

      {isError && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-display">
          <AlertCircle size={16} />
          <span>Failed to load tickets. Please check your network connection and try again.</span>
        </div>
      )}

      {!isPending && !isError && organizer.sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-center">
          <Inbox size={26} className="text-text-muted mb-3" />
          <h3 className="text-sm font-medium">No tickets found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-xs">
            {organizer.hasActiveFilters ? 'No tickets matched your search or filters.' : 'No tickets registered.'}
          </p>
          {organizer.hasActiveFilters && (
            <Button size="sm" variant="outline" onClick={organizer.handleResetFilters} className="mt-4 gap-1.5">
              <RotateCcw size={13} /> Reset Filters
            </Button>
          )}
        </div>
      )}

      {organizer.view === 'list' && !isPending && organizer.sorted.length > 0 && (
        <TicketGroupedList
          groups={organizer.groups}
          groupBy={organizer.groupBy}
          onSelectTicket={setSelectedTicket}
          departmentNames={departmentNames}
        />
      )}

      {organizer.view === 'board' && !isPending && organizer.sorted.length > 0 && (
        <TicketBoard
          tickets={organizer.sorted}
          departmentNames={departmentNames}
          isVerifier={isVerifier}
          onOpen={setSelectedTicket}
        />
      )}

      {organizer.view === 'list' && organizer.totalPages > 1 && (
        <div className="pt-4 border-t border-border/40 flex justify-center">
          <PageNav page={organizer.safePage} totalPages={organizer.totalPages} onPageChange={organizer.setPage} />
        </div>
      )}

      {/* Popups & Modals */}
      {showForm && <TicketForm onClose={() => setShowForm(false)} />}
      {showExport && (
        <ExportDialog
          reportModule="tickets"
          title="Export Tickets"
          description="Every ticket created in the selected period — status, priority, department, assignee, and TAT."
          onClose={() => setShowExport(false)}
        />
      )}
      {selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  );
};