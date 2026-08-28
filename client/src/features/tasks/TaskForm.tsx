import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckSquare } from 'lucide-react';
import { Input, Modal, DateRangePicker } from '../../components';
import type { DateRangeValue } from '../../components';
import { useCreateTaskWithAttachmentsMutation, useAssignableUsersQuery } from './hook';
import { TaskDescriptionField } from './TaskDescriptionField';
import { AttachFilesToolbar } from './AttachFilesToolbar';
import { StagedFileChips } from './StagedFileChips';
import { useDepartmentsQuery } from '../tickets/hook';
import { useAuth } from '../../context/AuthContext';
import type { Task } from '../../api/task';
import { TaskFormDepartmentField } from './TaskFormDepartmentField';
import { TaskAssigneesField } from './TaskAssigneesField';
import { TaskFormPrioritySelector } from './TaskFormPrioritySelector';
import { TaskFormErrorBanner } from './TaskFormErrorBanner';
import { FIELD_LABEL_CLASS, FIELD_CARD_CLASS } from './taskFormFieldStyles';

const taskSchema = z.object({
  title:        z.string().trim().min(1, 'Title is required'),
  description:  z.string().optional(),
  priority:     z.enum(['low', 'medium', 'high']),
  departmentId: z.string().optional().or(z.literal('')),
});

type TaskFields = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onClose: () => void;
  onCreated?: (task: Task) => void;
}

export const TaskForm = ({ onClose, onCreated }: TaskFormProps) => {
  const { user } = useAuth();
  const mutation = useCreateTaskWithAttachmentsMutation();
  const { data: assignableUsers, isLoading: isLoadingUsers } = useAssignableUsersQuery();
  const { data: departments, isLoading: isLoadingDepts } = useDepartmentsQuery();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: null, to: null });
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskFields>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'medium',
      departmentId: user?.departmentId ?? '',
      description: '',
    },
  });

  const isBusy = mutation.isPending || isSubmitting;

  const onSubmit = (data: TaskFields) => {
    mutation.mutate(
      {
        payload: {
          title:                 data.title,
          description:           data.description,
          priority:              data.priority,
          startDate:             dateRange.from ? dateRange.from.toISOString() : undefined,
          dueDate:               dateRange.to ? dateRange.to.toISOString() : undefined,
          assigneeId:            assigneeIds[0],
          additionalAssigneeIds: assigneeIds.slice(1),
          departmentId:          data.departmentId !== '' ? data.departmentId : undefined,
        },
        files,
      },
      {
        onSuccess: (createdTask) => {
          onCreated?.(createdTask);
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="3xl" // Slightly larger to accommodate the beautiful two-pane layout comfortably
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <CheckSquare className="w-5 h-5 text-primary-600" />
        </div>
      }
      title={<span className="text-xl font-semibold text-text">Add new delegation</span>}
      description="Define objectives, set priorities, and assign responsible members."
      bodyClassName="p-0 sm:p-0 overflow-hidden" // Prevent modal level scroll, allow column scroll
      footer={
        <div className="flex items-center justify-end w-full gap-3 px-2 py-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={isBusy}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-all duration-200 ease-in-out flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Create Delegation'
            )}
          </button>
        </div>
      }
    >
      <form 
        id="task-form" 
        onSubmit={handleSubmit(onSubmit)} 
        className="flex flex-col md:flex-row h-full max-h-[75vh] md:max-h-[80vh] w-full"
        noValidate
      >
        {/* Left column - Main Content (Independent Scroll) */}
        <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto">
          <Input
            id="title"
            label={<>Delegation Title <span className="text-danger">*</span></>}
            placeholder="e.g. Redesign the landing page hero section"
            error={errors.title?.message}
            className="text-lg font-medium py-3 border-border focus:border-primary-500 focus:ring-primary-500/20 rounded-lg transition-all"
            labelClassName={FIELD_LABEL_CLASS}
            containerClassName={FIELD_CARD_CLASS}
            {...register('title')}
            autoFocus
          />

          {/* PERF FIX: Wrapped in Controller to prevent full-form re-renders on every keystroke */}
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TaskDescriptionField
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Provide delegation context, constraints, acceptance criteria, or relevant links…"
                toolbar={<AttachFilesToolbar onFiles={(list) => setFiles((prev) => [...prev, ...Array.from(list)])} />}
              >
                {files.length > 0 && (
                  <StagedFileChips files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))} />
                )}
              </TaskDescriptionField>
            )}
          />

          {mutation.isError && (
            <TaskFormErrorBanner error={mutation.error} fallback="Failed to create task. Please verify your inputs and try again." />
          )}
        </div>

        {/* Right column - Metadata Sidebar (Independent Scroll with soft background) */}
        <div className="w-full md:w-[22rem] flex flex-col gap-6 p-6 md:p-8 bg-surface-hover/40 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
          
          <TaskAssigneesField
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            users={assignableUsers}
            isLoading={isLoadingUsers}
          />

          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <TaskFormPrioritySelector
                value={field.value}
                onChange={field.onChange}
                disabled={isBusy}
              />
            )}
          />

          <div className={`group/field flex flex-col gap-2 ${FIELD_CARD_CLASS}`}>
            <label className={FIELD_LABEL_CLASS}>
              Timeline
            </label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              triggerClassName="w-full py-2.5 bg-surface border border-border rounded-lg hover:border-border-hover focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
            />
          </div>

          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <TaskFormDepartmentField
                value={field.value ?? ''}
                onChange={field.onChange}
                departments={departments}
                isLoading={isLoadingDepts}
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
};