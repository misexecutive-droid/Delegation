import { useState, type FormEvent } from 'react';
import { ListTodo, CalendarDays } from 'lucide-react';
import { Button, Modal, Input, DatePicker } from '../../components';
import { TaskFormPrioritySelector } from '../tasks/TaskFormPrioritySelector';
import { FIELD_LABEL_ICON_CLASS, FIELD_CARD_CLASS } from '../tasks/taskFormFieldStyles';
import { TODO_INPUT_CLASS, TODO_TRIGGER_CLASS, TODO_LABEL_CLASS, TODO_BUTTON_CLASS } from './todoFormStyles';
import { useCreateTodoMutation } from './hook';
import type { TodoPriority } from '../../api/todos';

interface CreateTodoModalProps {
  open: boolean;
  onClose: () => void;
}

// Shared by the To-Do page's "Todo Task" button and the Dashboard header's — same quick-add
// modal, opened directly from wherever the user is instead of navigating to the To-Do page first.
export const CreateTodoModal = ({ open, onClose }: CreateTodoModalProps) => {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateTodoMutation();

  if (!open) return null;

  const closeAndReset = () => {
    onClose();
    setText('');
    setDueDate(null);
    setPriority('medium');
    setError(null);
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Task is required');
      return;
    }
    createMut.mutate(
      { text: trimmed, priority, dueDate: dueDate ? dueDate.toISOString() : undefined },
      { onSuccess: closeAndReset },
    );
  };

  // Shared "field" wrapper so every row in the form — input, date, priority — lines up on the
  // same card padding/border instead of the priority selector floating unaligned with the rest.
  const fieldWrapperClass = `group/field flex flex-col gap-1.5 ${FIELD_CARD_CLASS} transition-shadow duration-200 hover:shadow-sm`;

  return (
    <Modal
      open
      onClose={closeAndReset}
      icon={<ListTodo className="w-5 h-5 text-primary-600" />}
      title="New todo task"
      description="A personal task, not assigned to anyone else."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`${TODO_BUTTON_CLASS} transition-transform duration-150 active:scale-95`}
            onClick={closeAndReset}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="todo-form"
            variant="primary"
            size="sm"
            className={`${TODO_BUTTON_CLASS} transition-transform duration-150 active:scale-95`}
            isLoading={createMut.isPending}
          >
            Add task
          </Button>
        </>
      }
    >
      <form id="todo-form" onSubmit={handleCreate} className="flex flex-col gap-5" noValidate>
        <div
          className="animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          <Input
            autoFocus
            label="Task"
            placeholder="e.g. Follow up with the vendor"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            maxLength={200}
            labelClassName={TODO_LABEL_CLASS}
            containerClassName={`${FIELD_CARD_CLASS} transition-shadow duration-200 focus-within:shadow-sm`}
            className={`${TODO_INPUT_CLASS} transition-colors duration-150 ${error ? 'border-b-danger focus:border-b-danger' : ''}`}
          />
        </div>

        <div
          className={`${fieldWrapperClass} animate-in fade-in slide-in-from-top-2 duration-300`}
          style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}
        >
          <label className={TODO_LABEL_CLASS}>
           Due date (optional)
          </label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="No due date set"
            triggerClassName={`${TODO_TRIGGER_CLASS} transition-colors duration-150`}
          />
        </div>

        <div
          className={`${fieldWrapperClass} animate-in fade-in slide-in-from-top-2 duration-300`}
          style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}
        >
          <TaskFormPrioritySelector value={priority} onChange={setPriority} />
        </div>
      </form>
    </Modal>
  );
};