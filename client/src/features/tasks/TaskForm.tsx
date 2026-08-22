import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckSquare, CalendarRange } from 'lucide-react';
import { Input, Textarea, Modal, DateRangePicker } from '../../components';
import type { DateRangeValue } from '../../components';
import { useCreateTaskMutation, useAssignableUsersQuery } from './hook';
import { useDepartmentsQuery } from '../tickets/hook';
import { useAuth } from '../../context/AuthContext';
import type { Task } from '../../api/task';
import { TaskFormDepartmentField } from './TaskFormDepartmentField';
import { TaskAssigneesField } from './TaskAssigneesField';
import { TaskFormReminderField } from './TaskFormReminderField';
import { TaskFormErrorBanner } from './TaskFormErrorBanner';
import { FIELD_LABEL_CLASS, FIELD_LABEL_ICON_CLASS, FIELD_CARD_CLASS } from './taskFormFieldStyles';

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

const PRIORITIES = [
  { id: 'low', label: 'Low', short: 'L', activeClass: 'bg-gray-800 text-white border-gray-600' },
  { id: 'medium', label: 'Medium', short: 'M', activeClass: 'bg-gray-800 text-white border-gray-600' },
  { id: 'high', label: 'High', short: 'H', activeClass: 'bg-danger/10 text-danger border-danger/50' },
] as const;

export const TaskForm = ({ onClose, onCreated }: TaskFormProps) => {
  const { user } = useAuth();
  const mutation = useCreateTaskMutation();
  const { data: assignableUsers, isLoading: isLoadingUsers } = useAssignableUsersQuery();
  const { data: departments, isLoading: isLoadingDepts } = useDepartmentsQuery();
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [reminderChannel, setReminderChannel] = useState<Task['reminderChannel']>('notification');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: null, to: null });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFields>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'medium',
      departmentId: user?.departmentId ?? '',
    },
  });

  const priority     = watch('priority');
  const departmentId = watch('departmentId');

  const onSubmit = (data: TaskFields) => {
    mutation.mutate(
      {
        title:                 data.title,
        description:           data.description,
        priority:              data.priority,
        startDate:             dateRange.from ? dateRange.from.toISOString() : undefined,
        dueDate:               dateRange.to ? dateRange.to.toISOString() : undefined,
        reminderMinutesBefore: reminderMinutes ?? undefined,
        reminderChannel:       reminderMinutes ? reminderChannel : undefined,
        assigneeId:            assigneeIds[0],
        additionalAssigneeIds: assigneeIds.slice(1),
        departmentId:          data.departmentId !== '' ? data.departmentId : undefined,
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
      size="2xl"
      icon={<CheckSquare className="w-5 h-5 text-primary-600" />}
      title="Add new delegation"
      description="Define objectives, set priorities, and assign responsible members."
      bodyClassName="p-0"
      footer={
        <div className="p-4 md:p-5 border-t border-gray-200 dark:border-gray-700/50">
          <button
            type="submit"
            form="task-form"
            disabled={mutation.isPending || isSubmitting}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending || isSubmitting ? 'Saving...' : '+ Add new delegation'}
          </button>
        </div>
      }
    >
      <form 
        id="task-form" 
        onSubmit={handleSubmit(onSubmit)} 
        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_20rem] max-h-[75vh] md:max-h-[85vh] overflow-y-auto" 
        noValidate
      >
        {/* Left column */}
        <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-5">
          <Input
            id="title"
            label={<>Delegation Title <span className="text-danger">*</span></>}
            placeholder="e.g. Redesign the landing page hero section"
            error={errors.title?.message}
            className="focus:border-primary-500 focus:ring-primary-500/20"
            labelClassName={FIELD_LABEL_CLASS}
            containerClassName={FIELD_CARD_CLASS}
            {...register('title')}
            autoFocus
          />

          <Textarea
            id="description"
            label="Description"
            containerClassName={`${FIELD_CARD_CLASS} flex-1 min-h-0`}
            rows={6}
            placeholder="Provide delegation context, constraints, acceptance criteria, or relevant links…"
            className="focus:border-primary-500 focus:ring-primary-500/20 h-full min-h-[120px] md:min-h-[200px] resize-none"
            labelClassName={FIELD_LABEL_CLASS}
            {...register('description')}
          />

          {mutation.isError && (
            <TaskFormErrorBanner error={mutation.error} fallback="Failed to create task. Please verify your inputs and try again." />
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-5 border-t border-gray-200 md:border-t-0 md:border-l dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10">
          <TaskAssigneesField
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            users={assignableUsers}
            isLoading={isLoadingUsers}
          />

          {/* Inlined Priority Selector */}
          <div className={`group/field flex flex-col gap-1.5 ${FIELD_CARD_CLASS}`}>
            <label className={FIELD_LABEL_CLASS}>
              Priority Level
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const isActive = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setValue('priority', p.id as 'low' | 'medium' | 'high')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md text-center transition-all border
                      ${
                        isActive
                          ? p.activeClass
                          : 'border-gray-700/50 bg-gray-900/30 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }
                    `}
                  >
                    {/* Mobile: Show only first letter */}
                    <span className="sm:hidden">{p.short}</span>
                    {/* Desktop (sm and up): Show full word */}
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`group/field flex flex-col gap-1.5 ${FIELD_CARD_CLASS}`}>
            <label className={FIELD_LABEL_CLASS}>
              <CalendarRange className={FIELD_LABEL_ICON_CLASS} /> Start &amp; Due Date
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          <TaskFormDepartmentField
            value={departmentId ?? ''}
            onChange={(v) => setValue('departmentId', v)}
            departments={departments}
            isLoading={isLoadingDepts}
          />

          <TaskFormReminderField
            minutes={reminderMinutes}
            channel={reminderChannel}
            onChange={(minutes, next) => { setReminderMinutes(minutes); setReminderChannel(next); }}
          />
        </div>
      </form>
    </Modal>
  );
};