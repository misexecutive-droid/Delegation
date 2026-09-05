import type { Ticket } from '../../../api/ticket';
import { TicketBoardColumn } from './TicketBoardColumn';
import { TICKET_BOARD_COLUMNS } from './ticketBoardColumns';

export interface TicketBoardColumnsRowProps {
  tickets: Ticket[];
  draggable: boolean;
  onOpen: (ticket: Ticket) => void;
  departmentNames?: Map<string, string>;
}

// Shared between the read-only (!isVerifier) and draggable (verifier) boards below — only the
// `draggable` flag differs, so this is the one place the columns' responsive layout is defined.
export const TicketBoardColumnsRow = ({ tickets, draggable, onOpen, departmentNames }: TicketBoardColumnsRowProps) => (
  <div className="flex xl:grid xl:grid-cols-5 gap-4 xl:gap-5 items-stretch overflow-x-auto xl:overflow-visible snap-x snap-mandatory xl:snap-none pb-2 xl:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
    {TICKET_BOARD_COLUMNS.map(status => (
      <div key={status} className="flex-1 min-w-[280px] sm:min-w-[320px] xl:min-w-0 snap-start">
        <TicketBoardColumn
          status={status}
          tickets={tickets.filter(t => t.status === status)}
          draggable={draggable}
          onOpen={onOpen}
          departmentNames={departmentNames}
        />
      </div>
    ))}
  </div>
);
