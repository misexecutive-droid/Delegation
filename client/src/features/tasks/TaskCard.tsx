import {
  Loader2,
  Trash2,
  User,
  UserCog,
  CheckCircle2,
  ShieldQuestion,
  Clock,
  CalendarPlus,
  History,
} from "lucide-react";
import { useDeleteTaskMutation } from "./hook";
import { TaskVerifyActions } from "./TaskVerifyActions";
import { PRIORITY_MAP } from "./taskDisplay";
import { TaskScoreBadge } from "./TaskScoreBadge";
import { departmentTagClass } from "./departmentTagColors";
import { TaskSourceBadge } from "./TaskSourceBadge";
import { coverPhotoFor } from "./taskAttachmentDisplay";
import { UPLOADS_BASE } from "../../lib/uploadsBase";
import { avatarColorClass } from "./avatarColors";
import { getInitials } from "../../lib/getInitials";
import { getChecklistProgress } from "../../lib/checklistProgress";
import { ChecklistProgressBar, DueProgressBar } from "../../components/progress";
import { PriorityChip } from "./PriorityChip";
import { CATEGORY_CONFIG, formatShortDateTime, type CardFieldVisibility } from "./cardFields";
import type { Task } from "../../api/task";

interface TaskCardProps {
  task: Task;
  assigneeNames?: string[];
  raisedByName?: string;
  departmentName?: string;
  isVerifier: boolean;
  onOpen: (task: Task, mode?: 'view' | 'edit') => void;
  index?: number;
  fields: CardFieldVisibility;
  /** True when this task has an unread "you were just assigned this" notification — shows a small
   *  callout naming who raised it, until the card is opened. */
  isNewlyAssigned?: boolean;
}

const MAX_VISIBLE_AVATARS = 3;

const daysLeftLabel = (dueDate: string) => {
  const diffMs = new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
};

export const TaskCard = ({ task, assigneeNames = [], raisedByName, departmentName, isVerifier, onOpen, fields, isNewlyAssigned }: TaskCardProps) => {
  const deleteMutation = useDeleteTaskMutation();
  const priority = PRIORITY_MAP[task.priority];
  const coverPhoto = coverPhotoFor(task.attachments);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const { doneItems, totalItems, progress } = getChecklistProgress(task.checklists ?? []);

  const showDoneBadge = fields.status && task.status === 'done';
  const showReviewBadge = fields.status && task.status === 'pending_verification' && !isVerifier;
  const showVerifyActions = task.status === 'pending_verification' && isVerifier;
  const showDuePill = fields.dueDate && task.dueDate && task.status !== 'done' && task.status !== 'pending_verification';

  return (
    <div
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative flex flex-col gap-2.5 p-4 pl-4 rounded-lg border border-border bg-surface hover:border-primary-500/40 transition-colors duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 overflow-hidden"
    >
      {isNewlyAssigned && raisedByName && (
        <div className="flex items-center gap-1.5 -mt-1 -mx-1 px-2.5 py-1.5 rounded-lg bg-info/10 text-[11px] font-medium text-info">
          <UserCog size={12} strokeWidth={2.5} className="shrink-0" />
          <span className="truncate">New delegation from {raisedByName} — kindly review</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-text truncate leading-snug">
          {task.title}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          <TaskSourceBadge aiMeta={task.aiMeta} />
          {isVerifier && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(task.id);
              }}
              disabled={deleteMutation.isPending}
              aria-label="Delete delegation"
              title="Delete delegation"
              className="flex items-center justify-center size-9 rounded-md text-text-light hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            >
              {deleteMutation.isPending ? (
                <Loader2 size={15} strokeWidth={2.5} className="animate-spin text-danger" />
              ) : (
                <Trash2 size={15} strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>
      </div>

      {coverPhoto && (
        <img
          src={`${UPLOADS_BASE}${coverPhoto.url}`}
          alt=""
          className="w-full aspect-video rounded-lg object-cover"
        />
      )}

      {task.description && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress — checklist completion when there's a checklist to track (governed by the
          "Subtasks" field toggle), otherwise how much of the created-to-due-date window has
          elapsed (governed by "Due date" instead, since there's no checklist to speak of). Same
          shared component Tickets use, so the two card types read identically. */}
      {fields.subtasks && progress !== null ? (
        <ChecklistProgressBar done={doneItems} total={totalItems} />
      ) : (
        fields.dueDate && task.dueDate && task.status !== 'done' && (
          <DueProgressBar createdAt={task.createdAt} dueDate={task.dueDate} />
        )
      )}

      {fields.raisedBy && raisedByName && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
          <UserCog size={12} strokeWidth={2.5} className="text-text-light shrink-0" />
          <span className="truncate">
            Raised by <span className="font-medium text-text-secondary">{raisedByName}</span>
          </span>
        </div>
      )}

      {(fields.department || fields.priority || fields.category) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {fields.department && departmentName && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${departmentTagClass(departmentName)}`}>
              {departmentName}
            </span>
          )}

          {fields.priority && priority && <PriorityChip priority={task.priority} />}

          {fields.category && (() => {
            const cat = CATEGORY_CONFIG[task.category];
            return (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.className}`}>
                <cat.icon size={12} strokeWidth={2.5} />
                {cat.label}
              </span>
            );
          })()}

          {fields.status && <TaskScoreBadge status={task.status} variant="sm" />}
        </div>
      )}

      {(fields.created || fields.updated) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-text-light">
          {fields.created && (
            <span className="flex items-center gap-1" title={`Created ${formatShortDateTime(task.createdAt)}`}>
              <CalendarPlus size={12} strokeWidth={2.5} />
              {formatShortDateTime(task.createdAt)}
            </span>
          )}

          {fields.updated && (
            <span className="flex items-center gap-1" title={`Updated ${formatShortDateTime(task.updatedAt)}`}>
              <History size={12} strokeWidth={2.5} />
              {formatShortDateTime(task.updatedAt)}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        {fields.assignee ? (
          assigneeNames.length > 0 ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center -space-x-1.5 shrink-0">
                {assigneeNames.slice(0, MAX_VISIBLE_AVATARS).map((name, i) => (
                  <div
                    key={name + i}
                    className={`flex items-center justify-center size-6 rounded-full text-white text-[10px] font-bold ring-2 ring-surface shrink-0 ${avatarColorClass(name)}`}
                    title={`Assigned to ${name}`}
                  >
                    {getInitials(name)}
                  </div>
                ))}
                {assigneeNames.length > MAX_VISIBLE_AVATARS && (
                  <div
                    className="flex items-center justify-center size-6 rounded-full bg-surface-hover text-text-secondary text-[10px] font-bold ring-2 ring-surface shrink-0"
                    title={assigneeNames.slice(MAX_VISIBLE_AVATARS).join(', ')}
                  >
                    +{assigneeNames.length - MAX_VISIBLE_AVATARS}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium text-text-secondary truncate">
                {assigneeNames[0]}
                {assigneeNames.length > 1 ? ` +${assigneeNames.length - 1}` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="flex items-center justify-center size-6 rounded-full bg-surface-hover text-text-light ring-2 ring-surface shrink-0"
                title="Unassigned"
              >
                <User size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-medium text-text-light truncate">Unassigned</span>
            </div>
          )
        ) : (
          <span />
        )}

        <div className="shrink-0">
          {showVerifyActions ? (
            <TaskVerifyActions task={task} compact />
          ) : showDoneBadge ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-success/10 text-success">
              <CheckCircle2 size={15} strokeWidth={2.5} />
              Done
            </span>
          ) : showReviewBadge ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-warning/10 text-warning">
              <ShieldQuestion size={15} strokeWidth={2.5} />
              In review
            </span>
          ) : showDuePill ? (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface-hover text-text-secondary'
              }`}
            >
              <Clock size={15} strokeWidth={2.5} />
              {daysLeftLabel(task.dueDate!)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
