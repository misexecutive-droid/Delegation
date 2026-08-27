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
import { TaskFormPrioritySelector } from './TaskFormPrioritySelector';
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

export const TaskForm = ({ onClose, onCreated }: TaskFormProps) => {
  const { user } = useAuth();
  const mutation = useCreateTaskMutation();
  const { data: assignableUsers, isLoading: isLoadingUsers } = useAssignableUsersQuery();
  const { data: departments, isLoading: isLoadingDepts } = useDepartmentsQuery();
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
  const isBusy = mutation.isPending || isSubmitting;

  const onSubmit = (data: TaskFields) => {
    mutation.mutate(
      {
        title:                 data.title,
        description:           data.description,
        priority:              data.priority,
        startDate:             dateRange.from ? dateRange.from.toISOString() : undefined,
        dueDate:               dateRange.to ? dateRange.to.toISOString() : undefined,
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
        <button
          type="submit"
          form="task-form"
          disabled={isBusy}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 ease-in-out flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy ? 'Saving...' : '+ Add new delegation'}
        </button>
      }
    >
      <form 
        id="task-form" 
        onSubmit={handleSubmit(onSubmit)} 
        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_20rem] max-h-[75vh] md:max-h-[85vh] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        noValidate
      >
        {/* Left column */}
        <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-5">
          <Input
            id="title"
            label={<>Delegation Title <span className="text-danger">*</span></>}
            placeholder="e.g. Redesign the landing page hero section"
            error={errors.title?.message}
            className="focus:border-border focus:ring-0"
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
            className="focus:border-border hover:border-border focus:ring-0 h-full min-h-[120px] md:min-h-[200px] resize-none"
            labelClassName={FIELD_LABEL_CLASS}
            {...register('description')}
          />

          {mutation.isError && (
            <TaskFormErrorBanner error={mutation.error} fallback="Failed to create task. Please verify your inputs and try again." />
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-5 border-t border-border md:border-t-0">
          <TaskAssigneesField
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            users={assignableUsers}
            isLoading={isLoadingUsers}
          />

          <TaskFormPrioritySelector
            value={priority}
            onChange={(v) => setValue('priority', v)}
            disabled={isBusy}
          />

          <div className={`group/field flex flex-col gap-1.5 ${FIELD_CARD_CLASS}`}>
            <label className={FIELD_LABEL_CLASS}>
              <CalendarRange className={FIELD_LABEL_ICON_CLASS} /> Start &amp; Due Date
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} triggerClassName="hover:border-border focus:ring-0" />
          </div>

          <TaskFormDepartmentField
            value={departmentId ?? ''}
            onChange={(v) => setValue('departmentId', v)}
            departments={departments}
            isLoading={isLoadingDepts}
          />
        </div>
      </form>
    </Modal>
  );
};