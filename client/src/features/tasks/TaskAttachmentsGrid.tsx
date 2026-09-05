import { Trash2, Loader2 } from 'lucide-react';
import { useDeleteTaskAttachmentMutation } from './hook';
import { isImageAttachment, attachmentIconFor, attachmentTypeLabel, formatFileSize } from './taskAttachmentDisplay';
import { UPLOADS_BASE } from '../../lib/uploadsBase';
import type { TaskAttachment } from '../../api/task';

interface TaskAttachmentsGridProps {
  taskId: string;
  attachments: TaskAttachment[];
  canManage: boolean;
}

// Already-uploaded files — just the thumbnail grid + delete, no header/toolbar of its own (that
// lives in TaskDescriptionField's toolbar slot instead, one level up).
export const TaskAttachmentsGrid = ({ taskId, attachments, canManage }: TaskAttachmentsGridProps) => {
  const deleteMutation = useDeleteTaskAttachmentMutation(taskId);

  if (attachments.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {attachments.map((file) => {
        const Icon = attachmentIconFor(file.mimeType);
        const isImage = isImageAttachment(file.mimeType);
        return (
          <div key={file.id} className="group relative rounded-lg border border-border bg-surface overflow-hidden hover:border-border-hover transition-colors">
            <a
              href={`${UPLOADS_BASE}${file.url}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col"
              title={file.originalFilename ?? attachmentTypeLabel(file.mimeType)}
            >
              <div className="aspect-square flex items-center justify-center bg-surface-hover/60">
                {isImage ? (
                  <img
                    src={`${UPLOADS_BASE}${file.url}`}
                    alt={file.originalFilename ?? 'attachment'}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Icon size={28} className="text-text-light" />
                )}
              </div>
              <div className="px-2 py-1.5 flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium text-text truncate">
                  {file.originalFilename ?? attachmentTypeLabel(file.mimeType)}
                </span>
                <span className="text-[10px] text-text-muted">
                  {attachmentTypeLabel(file.mimeType)} · {formatFileSize(file.sizeBytes)}
                </span>
              </div>
            </a>

            {canManage && (
              <button
                type="button"
                onClick={() => deleteMutation.mutate(file.id)}
                disabled={deleteMutation.isPending}
                aria-label="Remove attachment"
                title="Remove attachment"
                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-danger/90 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:scale-105 cursor-pointer shadow-2xs outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-danger/50 disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
