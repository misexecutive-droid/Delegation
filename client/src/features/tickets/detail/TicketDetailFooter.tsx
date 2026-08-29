import { Trash2, RefreshCw, ChevronDown } from 'lucide-react';
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
    <SheetFooter className="p-4 border-t border-border/40 flex-col sm:flex-col items-stretch gap-1.5">
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        {isAdmin && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
            className="gap-1.5 font-display text-xs"
          >
            <Trash2 size={13} />
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
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border cursor-pointer transition-all ml-auto disabled:opacity-50 disabled:cursor-not-allowed ${statusBadgeClass}`}
              >
                <RefreshCw size={12} />
                {statusLabel}
                <ChevronDown size={12} />
              </button>
            }
          />
        )}
      </div>

      {isVerifier && !hasComments && (
        <p className="w-full text-[11px] text-text-muted text-right">
          Add a comment before you can change the status.
        </p>
      )}
    </SheetFooter>
  );
};
