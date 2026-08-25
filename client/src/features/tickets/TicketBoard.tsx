import {
  DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { TicketCard } from './TicketCard';
import { useUpdateTicketMutation, useVerifyTicketMutation } from './hook';
import { STATUS_CONFIG } from './ticketDisplay';
import type { Ticket } from '../../api/ticket';

const COLUMNS: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'ON_HOLD', 'CLOSED'];

interface TicketBoardProps {
  tickets: Ticket[];
  departmentNames?: Map<string, string>;
  isVerifier?: boolean;
  onOpen: (ticket: Ticket) => void;
}

interface CardProps {
  ticket: Ticket;
  onOpen: (ticket: Ticket) => void;
  departmentName?: string;
}

// Wraps TicketCard so the whole card can be picked up and dropped on another column — same
// wrapper-div-carries-`listeners` pattern as TaskBoard's DraggableCard, so dnd-kit's pointer
// handlers never sit on TicketCard's own <button> root, only on this outer div.
const DraggableCard = ({ ticket, onOpen, departmentName }: CardProps) => {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={isDragging ? 'opacity-40 cursor-grabbing touch-none' : 'cursor-grab touch-none'}
    >
      <TicketCard ticket={ticket} onClick={onOpen} departmentName={departmentName} />
    </div>
  );
};

interface ColumnProps {
  status: Ticket['status'];
  tickets: Ticket[];
  draggable: boolean;
  onOpen: (ticket: Ticket) => void;
  departmentNames?: Map<string, string>;
}

const Column = ({ status, tickets, draggable, onOpen, departmentNames }: ColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !draggable });
  const config = STATUS_CONFIG[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-xl border min-w-0 p-2 transition-colors duration-150 ${
        isOver ? 'border-primary-400 bg-primary-50/40' : 'border-border bg-surface-hover/40'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide truncate">
            {config.label}
          </h3>
          <span className={`flex items-center justify-center min-w-[1.5rem] h-5 px-2 text-xs font-bold rounded-full border border-border/60 ${config.className}`}>
            {tickets.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 min-h-[150px]">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 px-3 text-center border border-dashed border-border rounded-lg bg-surface/40 text-text-light">
            <Sparkles size={14} className="mb-1.5 text-text-light" />
            <span className="text-[11px] font-medium text-text-light">No tickets</span>
          </div>
        ) : draggable ? (
          tickets.map((ticket) => (
            <DraggableCard
              key={ticket.id}
              ticket={ticket}
              onOpen={onOpen}
              departmentName={ticket.departmentId ? departmentNames?.get(ticket.departmentId) : undefined}
            />
          ))
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={onOpen}
              departmentName={ticket.departmentId ? departmentNames?.get(ticket.departmentId) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Non-verifiers can't validly drag-and-drop at all: every status change they're allowed to make
// (IN_PROGRESS/ON_HOLD/IN_REVIEW) requires a mandatory remark via the ticket detail's status-update
// flow, so there's no raw {status} PATCH a drag gesture could represent for them — the board is
// read-only (click to open, no drag) for that role. Verifiers (PC/ADMIN) get full drag between all
// columns; dropping into CLOSED only succeeds from IN_REVIEW (routed through the verify/approve
// flow), matching CLOSED's real business rule instead of a raw status overwrite.
export const TicketBoard = ({ tickets, departmentNames, isVerifier = false, onOpen }: TicketBoardProps) => {
  const updateMutation = useUpdateTicketMutation();
  const verifyMutation = useVerifyTicketMutation();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTicket(tickets.find(t => t.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTicket(null);

    const newStatus = event.over?.id as Ticket['status'] | undefined;
    if (!newStatus) return;

    const ticket = tickets.find(t => t.id === event.active.id);
    if (!ticket || ticket.status === newStatus) return;

    if (newStatus === 'CLOSED') {
      if (ticket.status !== 'IN_REVIEW') {
        toast.error('Move to In Review before closing a ticket.');
        return;
      }
      verifyMutation.mutate({ id: ticket.id, payload: { action: 'APPROVE' } });
      return;
    }

    updateMutation.mutate({ id: ticket.id, payload: { status: newStatus } });
  };

  if (!isVerifier) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(status => (
          <Column
            key={status}
            status={status}
            tickets={tickets.filter(t => t.status === status)}
            draggable={false}
            onOpen={onOpen}
            departmentNames={departmentNames}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTicket(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(status => (
          <Column
            key={status}
            status={status}
            tickets={tickets.filter(t => t.status === status)}
            draggable
            onOpen={onOpen}
            departmentNames={departmentNames}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="w-60 rotate-1 shadow-xl cursor-grabbing">
            <TicketCard
              ticket={activeTicket}
              onClick={onOpen}
              departmentName={activeTicket.departmentId ? departmentNames?.get(activeTicket.departmentId) : undefined}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
