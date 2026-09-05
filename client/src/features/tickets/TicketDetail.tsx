import { useState } from 'react';
import { User } from 'lucide-react';
import {
  useTicketQuery,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useAssignableUsersQuery,
  useVerifyTicketMutation,
  useUploadTicketAttachmentMutation,
  useDeleteTicketAttachmentMutation,
  useAddTicketCommentMutation,
  useAddTicketStatusUpdateMutation,
} from './hook';
import { ImageLightbox, Button, type DropdownAction } from '../../components';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { getTicketStatusLabel } from '../../lib/ticketStatusLabel';
import { STATUS_OPTIONS, STATUS_CONFIG } from './detail/detailConstants';
import { TicketDetailHeader } from './detail/TicketDetailHeader';
import { TicketQuickAttributes } from './detail/TicketQuickAttributes';
import { VerificationNoteBanner } from '../../components/verificationBanner';
import { TicketDescription } from './detail/TicketDescription';
import { TicketAttachments } from './detail/TicketAttachments';
import { TicketStatusHistory } from './detail/TicketStatusHistory';
import { TicketComments } from './detail/TicketComments';
import { ChecklistPanel } from './ChecklistPanel';
import { TicketStatusUpdatePanel } from './detail/TicketStatusUpdatePanel';
import { TicketVerificationActions } from './detail/TicketVerificationActions';
import { TicketDetailFooter } from './detail/TicketDetailFooter';
import type { Ticket, RestrictedStatus, CaptureMethod } from '../../api/ticket';

interface TicketDetailProps {
  ticket: Ticket;
  onClose: () => void;
}

export const TicketDetail = ({ ticket: initialTicket, onClose }: TicketDetailProps) => {
  const { data: fresh, isPending } = useTicketQuery(initialTicket.id);
  const ticket = fresh ?? initialTicket;
  
  const updateMut = useUpdateTicketMutation();
  const deleteMut = useDeleteTicketMutation();
  const verifyMut = useVerifyTicketMutation();

  const { user: currentUser } = useAuth();
  const canAssign = currentUser?.role === "ADMIN" || currentUser?.role === "PC" || currentUser?.role === "MANAGER";
  
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "PC";
  const isVerifier = currentUser?.role === "PC" || currentUser?.role === "ADMIN";
  const canChangeStatus =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "PC" ||
    currentUser?.role === "MANAGER" ||
    ((currentUser?.role === "AGENT" || currentUser?.role === "USER") &&
      (ticket.assigneeId === currentUser?.id || ticket.userId === currentUser?.id));
      
  const selectableStatuses = isVerifier ? STATUS_OPTIONS : STATUS_OPTIONS.filter(s => s.value !== 'CLOSED');

  const { data: assignableUsers } = useAssignableUsersQuery(ticket.departmentId ?? undefined);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const uploadAttachment = useUploadTicketAttachmentMutation(ticket.id);
  const deleteAttachment = useDeleteTicketAttachmentMutation(ticket.id);

  const [commentText, setCommentText] = useState('');
  const addComment = useAddTicketCommentMutation(ticket.id);

  const [statusPick, setStatusPick] = useState<RestrictedStatus | null>(null);
  const [statusRemark, setStatusRemark] = useState('');
  const [statusPhotos, setStatusPhotos] = useState<File[]>([]);
  const [statusCaptureMethod, setStatusCaptureMethod] = useState<CaptureMethod>('GALLERY');
  const statusUpdateMut = useAddTicketStatusUpdateMutation(ticket.id);

  const addStatusPhotos = (files: FileList | null, method: CaptureMethod) => {
    if (!files || !files.length) return;
    setStatusPhotos(prev => [...prev, ...Array.from(files)]);
    setStatusCaptureMethod(method);
  };

  const handleSubmitStatusUpdate = () => {
    if (!statusPick || !statusRemark.trim()) return;
    statusUpdateMut.mutate(
      {
        status: statusPick,
        remark: statusRemark.trim(),
        captureMethod: statusPhotos.length ? statusCaptureMethod : undefined,
        files: statusPhotos,
      },
      { onSuccess: () => { setStatusPick(null); setStatusRemark(''); setStatusPhotos([]); } },
    );
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (images.length) uploadAttachment.mutate(images);
  };

  const handleDelete = () => {
    deleteMut.mutate(ticket.id, { onSuccess: onClose });
  };

  const isOverdue = ticket.isOverdue && ticket.status !== 'CLOSED';

  // This quick dropdown is the verifier-only path to change status (the remark-required "Update
  // Status" panel above only renders for non-verifiers) — without this, a verifier could set a
  // ticket On Hold with zero explanation, defeating the whole point of requiring a reason. Every
  // other status here still fires instantly; only On Hold is intercepted to collect one first,
  // via the exact same statusUpdateMut/remark field the non-verifier panel already uses.
  const [onHoldPromptOpen, setOnHoldPromptOpen] = useState(false);
  const [onHoldRemarkDraft, setOnHoldRemarkDraft] = useState('');

  const handleConfirmOnHold = () => {
    if (!onHoldRemarkDraft.trim()) return;
    statusUpdateMut.mutate(
      { status: 'ON_HOLD', remark: onHoldRemarkDraft.trim() },
      { onSuccess: () => { setOnHoldPromptOpen(false); setOnHoldRemarkDraft(''); } },
    );
  };

  const statusActions: DropdownAction[] = selectableStatuses.map(s => ({
    label: s.label,
    onClick: () =>
      s.value === 'ON_HOLD'
        ? setOnHoldPromptOpen(true)
        : updateMut.mutate({ id: ticket.id, payload: { status: s.value } }),
  }));
  
  const statusStyle = STATUS_CONFIG[ticket.status];
  const statusLabel = getTicketStatusLabel(
    ticket.status,
    currentUser?.role,
    STATUS_OPTIONS.find(s => s.value === ticket.status)?.label ?? ticket.status,
  );
  const statusBadgeClass = `${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`;
  // comments/attachments/checklists are typed as always-present arrays, but real API responses
  // have been seen omitting fields their own type claims are required — defaulted defensively
  // rather than trusting the type (see the dashboard's additionalAssigneeIds crash for precedent).
  const comments = ticket.comments ?? [];
  const attachments = ticket.attachments ?? [];
  const checklists = ticket.checklists ?? [];
  const hasComments = comments.length > 0;

  const assigneeActions: DropdownAction[] = [
    { label: 'Unassigned', onClick: () => updateMut.mutate({ id: ticket.id, payload: { assigneeId: null } }), icon: User },
    ...(assignableUsers ?? []).map(u => ({
      label: `${u.firstName} ${u.lastName ?? ''}`.trim(),
      onClick: () => updateMut.mutate({ id: ticket.id, payload: { assigneeId: u.id } }),
      icon: User,
    })),
  ];

  return (
    <Sheet open onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        className="sm:max-w-[600px] lg:max-w-[720px] w-full p-0 flex flex-col h-full overflow-hidden font-sans"
      >
        {/* Indeterminate loading bar */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 z-50 h-[3px] w-full bg-primary-50 overflow-hidden">
            <div className="h-full bg-primary-500 w-1/2 rounded-r-full animate-[slide_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Sticky Header */}
        <div className="z-10 bg-surface border-b border-border shrink-0">
          <TicketDetailHeader ticket={ticket} />
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-8 custom-scrollbar">

          <div className="flex flex-col gap-5">
            <TicketQuickAttributes
              ticket={ticket}
              currentUserRole={currentUser?.role}
              canAssign={canAssign}
              assigneeActions={assigneeActions}
              isOverdue={isOverdue}
            />
            <VerificationNoteBanner note={ticket.verificationNote} approved={ticket.status === 'CLOSED'} verifiedBy={ticket.verifiedBy} />
          </div>

          <div className="h-px w-full bg-border" />

          <TicketDescription description={ticket.description} />

          <div className="h-px w-full bg-border" />

          {/* This was fully built but never reachable from any screen — the checklist progress
              bar TicketCard already shows (via getChecklistProgress(ticket.checklists)) had
              nothing that could ever populate ticket.checklists, so it permanently read 0/0. */}
          <ChecklistPanel ticketId={ticket.id} checklists={checklists} />

          <TicketAttachments
            attachments={attachments}
            onUpload={handleFileUpload}
            isUploading={uploadAttachment.isPending}
            uploadErrorMessage={uploadAttachment.isError
              ? (uploadAttachment.error instanceof Error ? uploadAttachment.error.message : 'Upload failed.')
              : null}
            onDelete={id => deleteAttachment.mutate(id)}
            isDeleting={deleteAttachment.isPending}
            onPreview={setPreviewImage}
          />

          <div className="h-px w-full bg-border" />

          <TicketStatusHistory statusUpdates={ticket.statusUpdates} onPreview={setPreviewImage} />

          <TicketComments
            comments={comments}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onSubmit={() => addComment.mutate(commentText.trim(), { onSuccess: () => setCommentText('') })}
            isSubmitting={addComment.isPending}
            submitErrorMessage={addComment.isError
              ? (addComment.error instanceof Error ? addComment.error.message : 'Failed to post comment.')
              : null}
          />
        </div>

        {/* Pinned Action Panels & Footer */}
        <div className="relative z-20 flex flex-col shrink-0 border-t border-border bg-surface pb-safe">
          {canChangeStatus && !isVerifier && ticket.status !== 'CLOSED' && (
            <div className="px-5 sm:px-8 py-4 border-b border-border/60">
              <TicketStatusUpdatePanel
                statusPick={statusPick}
                onPickStatus={setStatusPick}
                statusRemark={statusRemark}
                onRemarkChange={setStatusRemark}
                statusPhotos={statusPhotos}
                onRemovePhoto={i => setStatusPhotos(prev => prev.filter((_, idx) => idx !== i))}
                onAddPhotos={addStatusPhotos}
                onSubmit={handleSubmitStatusUpdate}
                isSubmitting={statusUpdateMut.isPending}
                submitErrorMessage={statusUpdateMut.isError
                  ? (statusUpdateMut.error instanceof Error ? statusUpdateMut.error.message : 'Failed to update status.')
                  : null}
              />
            </div>
          )}

          {isVerifier && ticket.status === 'IN_REVIEW' && (
            <div className="px-5 sm:px-8 py-4 border-b border-border/60 bg-info/10">
              <TicketVerificationActions
                isPending={verifyMut.isPending}
                onApprove={() => verifyMut.mutate({ id: ticket.id, payload: { action: 'APPROVE' } })}
                onReject={note => verifyMut.mutate({ id: ticket.id, payload: { action: 'REJECT', note } })}
              />
            </div>
          )}

          <div className="px-5 sm:px-8 py-4">
            <TicketDetailFooter
              isAdmin={isAdmin}
              onDelete={handleDelete}
              isDeleting={deleteMut.isPending}
              isVerifier={isVerifier}
              statusActions={statusActions}
              statusLabel={statusLabel}
              statusBadgeClass={statusBadgeClass}
              hasComments={hasComments}
            />
          </div>
        </div>

        <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />

      </SheetContent>

      {/* Mandatory reason for On Hold — see the comment on statusActions above for why this
          intercepts just this one status instead of firing instantly like the others. */}
      <Dialog open={onHoldPromptOpen} onOpenChange={(open) => { if (!open) { setOnHoldPromptOpen(false); setOnHoldRemarkDraft(''); } }}>
        <DialogContent className="bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Why is this On Hold?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-text-muted -mt-2">
            A reason is required so anyone viewing this ticket can see at a glance why it's parked.
          </p>
          <textarea
            autoFocus
            value={onHoldRemarkDraft}
            onChange={(e) => setOnHoldRemarkDraft(e.target.value)}
            placeholder="Reason for putting this ticket on hold…"
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-surface text-text rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 placeholder:text-text-light resize-none"
          />
          {statusUpdateMut.isError && (
            <p className="text-xs text-danger">
              {statusUpdateMut.error instanceof Error ? statusUpdateMut.error.message : 'Failed to update status.'}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOnHoldPromptOpen(false); setOnHoldRemarkDraft(''); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmOnHold}
              disabled={!onHoldRemarkDraft.trim()}
              isLoading={statusUpdateMut.isPending}
            >
              Put On Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};