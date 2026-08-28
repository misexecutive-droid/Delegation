import { useRef, useState } from 'react';
import {
  Activity, MapPin, Smile,
  Calendar as CalendarIcon, Loader2, AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '../../components';
import { useTaskCommentsQuery, useCreateTaskCommentMutation } from './hook';
import { avatarColorClass } from './avatarColors';
import { getInitials } from '../../lib/getInitials';
import { attachmentIconFor, attachmentTypeLabel, isImageAttachment } from './taskAttachmentDisplay';
import { UPLOADS_BASE } from '../../lib/uploadsBase';
import { FIELD_LABEL_CLASS, FIELD_LABEL_ICON_CLASS } from './taskFormFieldStyles';
import { AttachFilesToolbar } from './AttachFilesToolbar';
import { StagedFileChips } from './StagedFileChips';

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🎉', '🔥', '✅', '❌', '⚠️', '📌', '⏰', '💡', '👏', '🚀', '😢'];

const ICON_BTN_CLASS =
  'flex items-center justify-center size-8 rounded-lg text-text-light hover:text-primary-600 hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

interface TaskActivitySectionProps {
  taskId: string;
}

// The task's activity feed: a toolbar-driven comment composer (attach files/photos, share your
// location, drop an emoji, insert a date) plus the running list of everyone's comments below it.
export const TaskActivitySection = ({ taskId }: TaskActivitySectionProps) => {
  const { data: comments, isLoading } = useTaskCommentsQuery(taskId);
  const createMutation = useCreateTaskCommentMutation(taskId);

  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inserts at the current cursor position rather than always appending, so picking an emoji or
  // date mid-sentence lands where you were actually typing.
  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${text}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const handleFiles = (list: FileList) => setFiles((prev) => [...prev, ...Array.from(list)]);

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const shareLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        insertAtCursor(`📍 https://maps.google.com/?q=${latitude},${longitude}`);
      },
      () => setIsLocating(false),
      { timeout: 8000 },
    );
  };

  const insertDate = (value: string) => {
    if (!value) return;
    const formatted = new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    insertAtCursor(`📅 ${formatted}`);
  };

  const canSubmit = (body.trim().length > 0 || files.length > 0) && !createMutation.isPending;

  const submit = () => {
    if (!canSubmit) return;
    createMutation.mutate(
      { body: body.trim() || undefined, files },
      { onSuccess: () => { setBody(''); setFiles([]); } },
    );
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-4 border-t border-border/60">
      <h3 className={FIELD_LABEL_CLASS}>
        <Activity className={FIELD_LABEL_ICON_CLASS} /> Activity
      </h3>

      <div className="flex flex-col gap-2">
        <label htmlFor="task-comment-body" className={FIELD_LABEL_CLASS}>
          Add a comment
        </label>

        <div className="flex flex-col rounded-md border border-border bg-surface transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-coral-400/30 overflow-hidden">
          <textarea
            id="task-comment-body"
            ref={textareaRef}
            rows={3}
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[100px] text-base sm:text-sm bg-transparent text-text placeholder:text-text-light outline-none resize-y border-0"
          />

          {files.length > 0 && (
            <div className="px-3 pb-2.5">
              <StagedFileChips files={files} onRemove={removeFile} />
            </div>
          )}
        </div>

        {createMutation.isError && (
          <div className="flex items-center gap-2 text-xs text-danger">
            <AlertCircle size={13} className="shrink-0" />
            {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to post comment.'}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            <AttachFilesToolbar onFiles={handleFiles} />

            <button type="button" title="Share location" disabled={isLocating} className={ICON_BTN_CLASS} onClick={shareLocation}>
              {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="Emoji" className={ICON_BTN_CLASS}>
                  <Smile size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="grid grid-cols-8 gap-0.5 p-2 w-auto">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertAtCursor(e)}
                    className="text-base leading-none hover:bg-surface-hover rounded p-1 cursor-pointer"
                  >
                    {e}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="Insert date" className={ICON_BTN_CLASS}>
                  <CalendarIcon size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-2 w-auto">
                <input
                  type="date"
                  onChange={(e) => insertDate(e.target.value)}
                  className="text-sm bg-surface border border-border rounded px-2 py-1 outline-none"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button type="button" size="sm" variant="primary" disabled={!canSubmit} isLoading={createMutation.isPending} onClick={submit}>
            Post comment
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-xs text-text-light">Loading activity…</p>
        ) : !comments?.length ? (
          <p className="text-xs text-text-light">No comments yet.</p>
        ) : (
          comments.map((c) => {
            const name = c.author ? `${c.author.firstName} ${c.author.lastName ?? ''}`.trim() : 'Unknown';
            return (
              <div key={c.id} className="flex gap-2.5">
                <span className={`flex items-center justify-center size-8 rounded-full text-[11px] font-bold text-white shrink-0 ${avatarColorClass(name)}`}>
                  {getInitials(name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{name}</span>
                    <span className="text-[11px] text-text-light">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>

                  {c.body && <p className="text-sm text-text-secondary whitespace-pre-wrap mt-0.5">{c.body}</p>}

                  {c.locationLat != null && c.locationLng != null && (
                    <a
                      href={`https://maps.google.com/?q=${c.locationLat},${c.locationLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-500 hover:underline mt-1"
                    >
                      <MapPin size={12} /> {c.locationLabel ?? 'Shared location'}
                    </a>
                  )}

                  {c.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {c.attachments.map((a, i) => {
                        const Icon = attachmentIconFor(a.mimeType);
                        return (
                          <a
                            key={i}
                            href={`${UPLOADS_BASE}${a.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-surface-hover border border-border rounded-lg px-2 py-1 hover:border-primary-400 transition-colors"
                          >
                            {isImageAttachment(a.mimeType) ? (
                              <img src={`${UPLOADS_BASE}${a.url}`} alt="" className="size-5 rounded object-cover" />
                            ) : (
                              <Icon size={13} className="text-text-light" />
                            )}
                            {a.originalFilename ?? attachmentTypeLabel(a.mimeType)}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
