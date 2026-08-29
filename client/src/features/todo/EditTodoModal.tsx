import { useState, type FormEvent } from 'react';
import { ListTodo } from 'lucide-react';
import { Button, Modal, Input, DatePicker } from '../../components';
import { TaskFormPrioritySelector } from '../tasks/TaskFormPrioritySelector';
import { TODO_FIELD_WRAPPER_CLASS, TODO_FIELD_LABEL_CLASS } from './CreateTodoModal';
import { useUpdateTodoMutation } from './hook';
import type { Todo } from '../../api/todos';

interface EditTodoModalProps {
  todo: Todo;
  onClose: () => void;
}

// Same form shell/styling as CreateTodoModal (shares its field-wrapper/label constants) — kept as
// a separate component since it's opened from a single row's quick action with that row's todo
// already in hand, rather than the page-level "add" button's empty state.
export const EditTodoModal = ({ todo, onClose }: EditTodoModalProps) => {
  const [text, setText] = useState(todo.text);
  const [dueDate, setDueDate] = useState<Date | null>(todo.dueDate ? new Date(todo.dueDate) : null);
  const [priority, setPriority] = useState(todo.priority);
  const [error, setError] = useState<string | null>(null);

  const updateMut = useUpdateTodoMutation();

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Task is required');
      return;
    }
    updateMut.mutate(
      { id: todo.id, payload: { text: trimmed, priority, dueDate: dueDate ? dueDate.toISOString() : null } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<ListTodo className="w-6 h-6 text-primary-500" />}
      title={<span className="text-xl font-bold text-text">Edit todo task</span>}
      description={<span className="text-text-muted">A personal task, not assigned to anyone else.</span>}
      footer={
        <div className="flex w-full justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-5 py-2.5 font-medium text-text-secondary hover:text-text hover:bg-surface-hover border-border rounded-lg transition-all duration-200 active:scale-95"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="todo-edit-form"
            variant="primary"
            size="sm"
            className="px-5 py-2.5 font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md rounded-lg transition-all duration-200 active:scale-95"
            isLoading={updateMut.isPending}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <form id="todo-edit-form" onSubmit={handleSave} className="flex flex-col gap-4 py-2" noValidate>
        <div className={`${TODO_FIELD_WRAPPER_CLASS} ${error ? 'border-danger/40 bg-danger/5' : ''}`}>
          <Input
            autoFocus
            label="What needs to be done?"
            placeholder="e.g. Follow up with the vendor"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            maxLength={200}
            labelClassName={TODO_FIELD_LABEL_CLASS}
            containerClassName="w-full"
            className={`w-full bg-transparent text-text placeholder:text-text-light border-none p-0 focus:ring-0 ${
              error ? 'text-danger placeholder:text-danger/50' : ''
            }`}
          />
        </div>

        <div className={TODO_FIELD_WRAPPER_CLASS}>
          <label className={TODO_FIELD_LABEL_CLASS}>
            Due date <span className="text-text-light font-normal ml-1">(optional)</span>
          </label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="No due date set"
            triggerClassName="w-full text-left bg-surface-hover hover:bg-surface-active border border-border rounded-lg px-3 py-2 text-text-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className={TODO_FIELD_WRAPPER_CLASS}>
          <label className={TODO_FIELD_LABEL_CLASS}>Priority level</label>
          <div className="pt-1">
            <TaskFormPrioritySelector value={priority} onChange={setPriority} />
          </div>
        </div>
      </form>
    </Modal>
  );
};