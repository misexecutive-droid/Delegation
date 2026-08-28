import { useState, type ReactNode } from 'react';
import { CheckSquare, Loader2, ChevronRight, CheckCircle2, ShieldQuestion, Trash2, SquarePen, Users, CalendarDays, Flag, Building2, Check } from 'lucide-react';
import { Modal, Button, DateRangePicker, Input } from '../../components';
import type { DateRangeValue } from '../../components';
import { useTaskQuery, useUpdateTaskMutation, useDeleteTaskMutation, useAssignableUsersQuery, useUploadTaskAttachmentsMutation } from './hook';
import { useDepartmentsQuery } from '../tickets/hook';
import { TaskVerifyActions } from './TaskVerifyActions';
import { TaskFormDepartmentField } from './TaskFormDepartmentField';
import { TaskAssigneesField } from './TaskAssigneesField';
import { TaskActivitySection } from './TaskActivitySection';
import { AttachFilesToolbar } from './AttachFilesToolbar';
import { TaskAttachmentsGrid } from './TaskAttachmentsGrid';
import { TaskVerificationBanner } from './TaskVerificationBanner';
import { STATUS_LABEL, PRIORITY_MAP, NEXT_STATUS } from './taskDisplay';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { TaskScoreBadge } from './TaskScoreBadge';
import { taskAssigneeIds } from './cardFields';
import { useAuth } from '../../context/AuthContext';
import { SECTION_LABEL_CLASS } from './taskFormFieldStyles';
import type { Task, UpdateTaskPayload } from '../../api/task';


const TitleEditor = ({ value, disabled, onSave, isViewMode }: { value: string, disabled: boolean, onSave: (val: string) => void, isViewMode: boolean }) => {
  const [title, setTitle] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  
  if (value !== prevValue) {
    setPrevValue(value);
    setTitle(value);
  }

  if (isViewMode) {
    return <h2 className="text-lg md:text-xl font-semibold text-text px-3 py-2 -ml-3">{value}</h2>;
  }

  return (
    <Input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => onSave(title)}
      disabled={disabled}
      placeholder="Delegation title"
      className="text-lg md:text-xl font-semibold w-full h-auto px-3 py-2 -ml-3 rounded-md border-0 bg-transparent text-text outline-none transition-all focus:ring-2 focus:ring-primary-500/30 disabled:opacity-70"
    />
  );
};

interface DescriptionEditorProps {
  value: string;
  disabled: boolean;
  onSave: (val: string) => void;
  toolbar?: ReactNode;
  children?: ReactNode;
}

const PlainDescriptionEditor = ({ value, disabled, onSave, toolbar, children }: DescriptionEditorProps) => {
  const [desc, setDesc] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDesc(value);
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => onSave(desc)}
        disabled={disabled}
        placeholder="Add more detail…"
        rows={3}
        className="w-full resize-none text-sm text-text bg-transparent border-0 p-0 outline-none placeholder:text-text-light disabled:opacity-70 disabled:cursor-not-allowed"
      />
      {toolbar && <div className="flex items-center gap-0.5">{toolbar}</div>}
      {children}
    </div>
  );
};


interface TaskFooterProps {
  task: Task;
  mode: 'view' | 'edit';
  isPC: boolean;
  isVerifier: boolean;
  nextStatus: Task['status'] | null;
  onEdit: () => void;
  onAdvance: (payload: UpdateTaskPayload) => void;
  isAdvancing: boolean;
  onClose: () => void;
}

const TaskFooter = ({ task, mode, isPC, isVerifier, nextStatus, onEdit, onAdvance, isAdvancing, onClose }: TaskFooterProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 pt-1">
    <div className="flex items-center gap-3 flex-wrap">
      <TaskScoreBadge status={task.status} />
      {task.status === 'done' && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success px-2 py-1 rounded-md">
          <CheckCircle2 size={15} /> Completed
        </span>
      )}
      {task.status === 'pending_verification' && !isVerifier && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-info bg-info/10 px-2 py-1 rounded-md">
          <ShieldQuestion size={15} /> Awaiting verification
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {mode === 'view' && !isPC && (
        <Button variant="outline" size="sm" onClick={onEdit} className="text-text-secondary hover:text-text border-border">
          <SquarePen size={14} className="mr-1" /> Edit Delegation
        </Button>
      )}
      {nextStatus && !isPC && (
        <Button
          variant="outline"
          size="sm"
          className="border-primary-200 text-primary-700 hover:bg-primary-50"
          disabled={isAdvancing}
          onClick={() => onAdvance({ status: nextStatus })}
        >
          {isAdvancing ? <Loader2 size={14} className="animate-spin mr-1" /> : <ChevronRight size={14} className="mr-1" />}
          Advance to {STATUS_LABEL[nextStatus as keyof typeof STATUS_LABEL]}
        </Button>
      )}
      <Button variant="primary" size="sm" onClick={onClose} className="px-6">
        Done
      </Button>
    </div>
  </div>
);

const STATUS_ORDER: Task['status'][] = ['todo', 'in_progress', 'pending_verification', 'done'];

// One consistent accent color for every filled segment (not a different hue per status) —
// it's a single progress indicator, not a status badge, so it shouldn't read as multicolored.
const TaskStatusProgressBar = ({ status }: { status: Task['status'] }) => {
  const currentIndex = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {STATUS_ORDER.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= currentIndex ? 'bg-primary-500' : 'bg-surface-hover'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {STATUS_ORDER.map((s, i) => (
          <span
            key={s}
            className={`flex-1 text-center text-[11px] font-medium truncate transition-colors duration-300 ${i <= currentIndex ? 'text-text-secondary' : 'text-text-light'}`}
          >
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
};

const PRIORITY_ORDER: Task['priority'][] = ['low', 'medium', 'high'];

// A plain colored "value" pill (matching PRIORITY_MAP's existing badge tint) instead of the
// always-visible three-button grid TaskFormPrioritySelector renders elsewhere — click it to
// change priority via a small menu, same as picking any other value rather than filling in a form.
const PriorityValuePicker = ({ value, onChange, disabled }: { value: Task['priority']; onChange: (v: Task['priority']) => void; disabled: boolean }) => {
  const current = PRIORITY_MAP[value];

  if (disabled) {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${current.className}`}>
        {current.label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${current.className}`}
        >
          {current.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {PRIORITY_ORDER.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)} className="gap-2">
            <span className={`size-2 rounded-full ${PRIORITY_MAP[p].accent}`} />
            {PRIORITY_MAP[p].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TIMELINE_STEP_DESCRIPTION: Record<Task['status'], string> = {
  todo: 'Delegation created and assigned.',
  in_progress: 'Work is underway.',
  pending_verification: 'Submitted for verification.',
  done: 'Delegation completed and closed.',
};

const formatStepDate = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const formatStepTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });


const TaskStatusTimeline = ({ task }: { task: Task }) => {
  const currentIndex = STATUS_ORDER.indexOf(task.status);
  const createdAt = new Date(task.createdAt);
  const updatedAt = new Date(task.updatedAt);

  return (
    <div className="flex flex-col">
      {STATUS_ORDER.map((s, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STATUS_ORDER.length - 1;
        const stamp = i === 0 ? createdAt : isCurrent ? updatedAt : null;

        return (
          <div key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex items-center justify-center size-6 rounded-full shrink-0 ${
                  isDone
                    ? 'bg-primary-500/20 text-primary-700'
                    : isCurrent
                      ? 'border-2 border-primary-500 bg-primary-50'
                      : 'border-2 border-border bg-surface'
                }`}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
                {isCurrent && <span className="size-2 rounded-full bg-primary-500" />}
              </span>
              {!isLast && <span className={`w-px flex-1 min-h-5 ${isDone ? 'bg-primary-500/20' : 'bg-border'}`} />}
            </div>
            <div className={`flex-1 min-w-0 flex items-start justify-between gap-3 ${isLast ? '' : 'pb-5'}`}>
              <div>
                <p className={`text-sm font-semibold ${isDone || isCurrent ? 'text-text' : 'text-text-light'}`}>{STATUS_LABEL[s]}</p>
                <p className="text-xs text-text-muted">{TIMELINE_STEP_DESCRIPTION[s]}</p>
              </div>
              {stamp && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-text-secondary">{formatStepDate(stamp)}</p>
                  <p className="text-[11px] text-text-light">{formatStepTime(stamp)}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PROPERTY_ROW_LABEL_CLASS = 'flex items-center gap-2 w-full sm:w-28 shrink-0 text-sm font-medium text-text-secondary';

interface TaskEditLayoutProps {
  task: Task;
  isVerifier: boolean;
  isViewOnly: boolean;
  canReassign: boolean;
  canManageAttachments: boolean;
  assignableUsers: ReturnType<typeof useAssignableUsersQuery>['data'];
  isLoadingUsers: boolean;
  departments: ReturnType<typeof useDepartmentsQuery>['data'];
  isLoadingDepts: boolean;
  onSaveTitle: (title: string) => void;
  onSaveDescription: (description: string) => void;
  onUpdate: (payload: UpdateTaskPayload) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  uploadMutation: ReturnType<typeof useUploadTaskAttachmentsMutation>;
}

const TaskEditLayout = ({
  task, isVerifier, isViewOnly, canReassign, canManageAttachments,
  assignableUsers, isLoadingUsers, departments, isLoadingDepts,
  onSaveTitle, onSaveDescription, onUpdate, onDelete, isDeleting, uploadMutation,
}: TaskEditLayoutProps) => (
  <div className="relative flex-1 min-h-0">
    <div className="h-full overflow-y-auto no-scrollbar flex flex-col gap-5 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <TitleEditor value={task.title} isViewMode={isViewOnly} disabled={isViewOnly} onSave={onSaveTitle} />
        </div>
        {isVerifier && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-danger border-danger/30 hover:bg-danger/10"
            disabled={isDeleting}
            onClick={() => onDelete(task.id)}
            aria-label="Delete delegation"
            title="Delete delegation"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </Button>
        )}
      </div>

      <TaskStatusProgressBar status={task.status} />

      <TaskVerificationBanner task={task} />

      {isVerifier && task.status === 'pending_verification' && (
        <TaskVerifyActions task={task} />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className={PROPERTY_ROW_LABEL_CLASS}>
            <Users size={15} className="text-text-light" /> Assigned to
          </span>
          <div className="flex-1 min-w-0">
            <TaskAssigneesField
              hideLabel
              selectedIds={taskAssigneeIds(task)}
              onChange={(ids) => onUpdate({ assigneeId: ids[0] ?? null, additionalAssigneeIds: ids.slice(1) })}
              users={assignableUsers}
              isLoading={isLoadingUsers}
              disabled={isViewOnly || !canReassign}
            />
            {!isViewOnly && !canReassign && (
              <p className="text-[11px] font-medium text-text-light mt-1">Only a manager or above can reassign.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className={PROPERTY_ROW_LABEL_CLASS}>
            <CalendarDays size={15} className="text-text-light" /> Timeline
          </span>
          <DateRangePicker
            value={{
              from: task.startDate ? new Date(task.startDate) : null,
              to: task.dueDate ? new Date(task.dueDate) : null,
            }}
            disabled={isViewOnly}
            onChange={(range: DateRangeValue) => onUpdate({
              startDate: range.from ? range.from.toISOString() : undefined,
              dueDate: range.to ? range.to.toISOString() : undefined,
            })}
            triggerClassName="w-auto h-auto p-0 border-0 shadow-none bg-transparent justify-start text-sm focus:ring-0"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className={PROPERTY_ROW_LABEL_CLASS}>
            <Flag size={15} className="text-text-light" /> Priority
          </span>
          <PriorityValuePicker value={task.priority} onChange={(v) => onUpdate({ priority: v })} disabled={isViewOnly} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className={PROPERTY_ROW_LABEL_CLASS}>
            <Building2 size={15} className="text-text-light" /> Department
          </span>
          <div className="flex-1 min-w-0">
            <TaskFormDepartmentField
              hideLabel
              value={task.departmentId ?? ''}
              onChange={(v) => onUpdate({ departmentId: v || null })}
              departments={departments}
              isLoading={isLoadingDepts}
              disabled={isViewOnly || !canReassign}
              triggerClassName="w-auto h-auto p-0 border-0 shadow-none bg-transparent justify-start text-sm focus:ring-0"
            />
            {!isViewOnly && !canReassign && (
              <p className="text-[11px] font-medium text-text-light mt-1">Only a manager or above can move departments.</p>
            )}
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      <div className="flex flex-col gap-2">
        <h3 className={SECTION_LABEL_CLASS}>Description</h3>
        <PlainDescriptionEditor
          value={task.description ?? ''}
          disabled={isViewOnly}
          onSave={onSaveDescription}
          toolbar={
            canManageAttachments && (
              <AttachFilesToolbar
                disabled={uploadMutation.isPending}
                onFiles={(files) => uploadMutation.mutate(Array.from(files))}
              />
            )
          }
        >
          {(uploadMutation.isPending || uploadMutation.isError || (task.attachments?.length ?? 0) > 0) && (
            <div className="flex flex-col gap-3 mt-4 pt-4">
              {uploadMutation.isPending && (
                <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
                  <Loader2 size={16} className="animate-spin text-primary-500" /> Uploading files…
                </p>
              )}
              {uploadMutation.isError && (
                <p className="text-sm font-medium text-danger bg-danger/10 p-3 rounded-lg border border-danger/20">
                  {uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Failed to upload files.'}
                </p>
              )}
              <TaskAttachmentsGrid taskId={task.id} attachments={task.attachments ?? []} canManage={canManageAttachments} />
            </div>
          )}
        </PlainDescriptionEditor>
      </div>

      <hr className="border-border/60" />

      <TaskStatusTimeline task={task} />

      <hr className="border-border/60" />

      <TaskActivitySection taskId={task.id} />
    </div>

    <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card to-transparent" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
  </div>
);

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  initialMode?: 'view' | 'edit';
}

export const TaskDetail = ({ task: initialTask, onClose, initialMode = 'view' }: TaskDetailProps) => {
  const { data: fresh } = useTaskQuery(initialTask.id);
  const task = fresh ?? initialTask;
  const { user } = useAuth();

  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

  const isPC = user?.role === 'PC';
  const isRestrictedUser = user?.role === 'USER';
  const isViewOnly = mode === 'view' || isPC || isRestrictedUser;
  const isVerifier = isPC || user?.role === 'ADMIN';
  const canReassign = user?.role !== 'AGENT' && user?.role !== 'USER';
  const canManageAttachments = isVerifier || task.userId === user?.id || taskAssigneeIds(task).includes(user?.id ?? '');
  const nextStatus = NEXT_STATUS[task.status as keyof typeof NEXT_STATUS];

  const updateMutation = useUpdateTaskMutation({ silent: true });
  const deleteMutation = useDeleteTaskMutation();
  const uploadAttachmentsMutation = useUploadTaskAttachmentsMutation(task.id);
  const { data: assignableUsers, isLoading: isLoadingUsers } = useAssignableUsersQuery();
  const { data: departments, isLoading: isLoadingDepts } = useDepartmentsQuery();

  const handleUpdate = (payload: UpdateTaskPayload) => {
    updateMutation.mutate({ id: task.id, payload });
  };

  const saveTitle = (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== task.title) {
      handleUpdate({ title: trimmed });
    }
  };

  const saveDescription = (newDesc: string) => {
    if (newDesc !== (task.description ?? '')) {
      handleUpdate({ description: newDesc });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={<CheckSquare className="w-5 h-5 text-primary-600" />}
      title={mode === 'edit' ? 'Edit delegation' : 'Delegation details'}
      description={mode === 'edit' ? 'Changes save automatically as you edit each field.' : 'Review this delegation’s details.'}
      bodyClassName="p-0 overflow-hidden rounded-b-xl"
      footer={
        <TaskFooter
          task={task}
          mode={mode}
          isPC={isPC}
          isVerifier={isVerifier}
          nextStatus={nextStatus}
          onEdit={() => setMode('edit')}
          onAdvance={handleUpdate}
          isAdvancing={updateMutation.isPending}
          onClose={onClose}
        />
      }
    >
      <div className="flex flex-col md:flex-row flex-1 min-h-0 h-[75vh]">
        <TaskEditLayout
          task={task}
          isVerifier={isVerifier}
          isViewOnly={isViewOnly}
          canReassign={canReassign}
          canManageAttachments={canManageAttachments}
          assignableUsers={assignableUsers}
          isLoadingUsers={isLoadingUsers}
          departments={departments}
          isLoadingDepts={isLoadingDepts}
          onSaveTitle={saveTitle}
          onSaveDescription={saveDescription}
          onUpdate={handleUpdate}
          onDelete={(id: string) => deleteMutation.mutate(id, { onSuccess: onClose })}
          isDeleting={deleteMutation.isPending}
          uploadMutation={uploadAttachmentsMutation}
        />
      </div>
    </Modal>
  );
};