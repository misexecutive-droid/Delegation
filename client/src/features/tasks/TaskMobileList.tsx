import { memo } from 'react';
import { TaskCard } from './TaskCard';
import { useTaskStatusMove } from './useTaskStatusMove';
import { STATUS_LABEL } from './taskDisplay';
import { taskAssigneeIds, type CardFieldVisibility } from './cardFields';
import type { Task } from '../../api/task';

const COLUMNS: Task['status'][] = ['todo', 'in_progress', 'pending_verification', 'done'];

const resolveAssigneeNames = (task: Task, assigneeNames: Map<string, string>) =>
  taskAssigneeIds(task).map((id) => assigneeNames.get(id)).filter((n): n is string => !!n);

// task.userId is whoever raised/created the delegation — assignableUsers (the same map used to
// resolve assignee names) covers them too, since anyone assignable can also raise a delegation.
const resolveRaisedByName = (task: Task, assigneeNames: Map<string, string>) =>
  assigneeNames.get(task.userId);

interface TaskMobileListProps {
  tasks: Task[];
  assigneeNames: Map<string, string>;
  departmentNames?: Map<string, string>;
  isVerifier: boolean;
  onOpen: (task: Task, mode?: 'view' | 'edit') => void;
  fields: CardFieldVisibility;
  newlyAssignedTaskIds?: Set<string>;
}

// Mobile's own rendering of the same board data — a single scrollable stack of cards grouped by
// status, instead of TaskBoard's side-by-side kanban columns. Deliberately skips
// DndContext/DraggableCard entirely rather than trying to make drag-and-drop work here too: a
// press-and-drag gesture fights the page's own vertical scroll on touch, so it never reads as
// reliable on a phone the way it does with a mouse.
//
// Since there's no drag here, the card's "Move to" menu is the *only* one-tap way to change a
// status on a phone — previously it meant opening the detail sheet first. It runs through the
// same useTaskStatusMove gate the board uses, so the verifier rule and the mandatory remark hold
// identically on both surfaces.
//
// Exported through `memo` below, for the same reason as TaskBoard: TaskList now hands both of them
// referentially stable props, so neither re-renders its cards when unrelated page state changes.
const TaskMobileListComponent = ({
  tasks,
  assigneeNames,
  departmentNames,
  isVerifier,
  onOpen,
  fields,
  newlyAssignedTaskIds,
}: TaskMobileListProps) => {
  const { requestMove, statusRemarkDialog } = useTaskStatusMove(isVerifier);

  return (
  <div className="flex flex-col gap-6">
    {COLUMNS.map((status) => {
      const columnTasks = tasks.filter((t) => t.status === status);
      if (columnTasks.length === 0) return null;

      return (
        <div key={status} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-bold text-text-secondary">{STATUS_LABEL[status]}</h3>
            <span className="flex items-center justify-center min-w-6 h-5 px-2 text-xs font-bold rounded-full border bg-primary-500/10 text-primary-600 border-primary-500/20 tabular-nums">
              {columnTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {columnTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isVerifier={isVerifier}
                onOpen={onOpen}
                assigneeNames={resolveAssigneeNames(task, assigneeNames)}
                raisedByName={resolveRaisedByName(task, assigneeNames)}
                departmentName={task.departmentId ? departmentNames?.get(task.departmentId) : undefined}
                fields={fields}
                isNewlyAssigned={newlyAssignedTaskIds?.has(task.id)}
                onMove={requestMove}
              />
            ))}
          </div>
        </div>
      );
    })}

    {statusRemarkDialog}
  </div>
  );
};

export const TaskMobileList = memo(TaskMobileListComponent);
