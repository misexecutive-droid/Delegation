import { Trash2, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { Button, Dropdown, type DropdownAction } from '../../../components';
import { SheetFooter } from '@/components/ui/sheet';

interface TicketDetailFooterProps {
  isAdmin: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  // Only verifiers (PC/Admin) get the quick status-change control — everyone else already has
  // the dedicated "Update Status" panel above, which requires a remark of its own.
  isVerifier: boolean;
  statusActions: DropdownAction[];
  statusLabel: string;
  statusBadgeClass: string;
  hasComments: boolean;
}

export const TicketDetailFooter = ({
  isAdmin,
  onDelete,
  isDeleting,
  isVerifier,
  statusActions,
  statusLabel,
  statusBadgeClass,
  hasComments,
}: TicketDetailFooterProps) => {
  // Nothing to show for a plain viewer — the sheet's own close (X) button up top already covers
  // dismissal, so this bar only needs to exist when there's an actual action to take.
  if (!isAdmin && !isVerifier) return null;

  return (
    // SheetFooter's own base classes default to a horizontal row from the `sm:` breakpoint up
    // (`sm:flex-row`) — a plain `flex-col` override here doesn't reach that variant, so on a
    // desktop-width viewport the hint paragraph below sat crammed beside the buttons instead of
    // stacking underneath. Overriding the `sm:` variant explicitly is what actually pins this to
    // a column at every width.
    <SheetFooter className="px-6 py-4 border-t border-border bg-surface/50 backdrop-blur-xl flex-col sm:flex-col items-stretch gap-2 pb-safe font-sans shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
      <div className="w-full flex items-center justify-between gap-3 flex-wrap">
        {isAdmin && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
            className="gap-2 font-bold text-sm px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1 active:scale-95"
          >
            <Trash2 size={16} strokeWidth={2.5} />
            Delete Ticket
          </Button>
        )}

        {isVerifier && (
          <Dropdown
            align="end"
            items={statusActions}
            trigger={
              <button
                type="button"
                disabled={!hasComments}
                title={hasComments ? 'Change status' : 'Add a comment before changing status'}
                className={`inline-flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border cursor-pointer transition-all ml-auto disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-95 ${statusBadgeClass}`}
              >
                <RefreshCw size={14} strokeWidth={2.5} />
                {statusLabel}
                <ChevronDown size={14} strokeWidth={2.5} className="opacity-70 ml-1" />
              </button>
            }
          />
        )}
      </div>

      {isVerifier && !hasComments && (
        <div className="flex items-center justify-end gap-1.5 w-full text-xs font-bold text-warning mt-1 animate-in fade-in duration-200">
          <AlertCircle size={14} strokeWidth={2.5} />
          <span>Add a comment before you can change the status.</span>
        </div>
      )}
    </SheetFooter>
  );
};