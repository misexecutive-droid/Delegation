import { ShieldCheck, ShieldX } from 'lucide-react';
import type { Ticket } from '../../../api/ticket';

interface VerificationBannerProps {
  ticket: Ticket;
}

// Shows the PC's note from the last approve/reject.
export const VerificationBanner = ({ ticket }: VerificationBannerProps) => {
  if (!ticket.verificationNote) return null;

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
      isClosed
        ? 'bg-success/10 border-success/20 text-success'
        : 'bg-warning/10 border-warning/20 text-warning'
    }`}>
      {isClosed ? <ShieldCheck size={14} className="shrink-0 mt-0.5" /> : <ShieldX size={14} className="shrink-0 mt-0.5" />}
      <div>
        <p className="font-medium">
          {isClosed && ticket.verifiedBy ? 'Verified' : 'Sent back for changes'}
        </p>
        <p className="mt-0.5 text-text-secondary">{ticket.verificationNote}</p>
      </div>
    </div>
  );
};
