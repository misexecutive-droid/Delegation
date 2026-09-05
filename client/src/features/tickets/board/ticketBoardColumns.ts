import type { Ticket } from '../../../api/ticket';

export const TICKET_BOARD_COLUMNS: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'ON_HOLD', 'CLOSED'];
