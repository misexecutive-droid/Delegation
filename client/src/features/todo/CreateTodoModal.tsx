import { useState, type FormEvent } from 'react';
import { ListTodo } from 'lucide-react';
import { Button, Modal, Input, DatePicker } from '../../components';
import { TaskFormPrioritySelector } from '../tasks/TaskFormPrioritySelector';
import { useCreateTodoMutation } from './hook';
import type { TodoPriority } from '../../api/todos';

interface CreateTodoModalProps {
  open: boolean;
  onClose: () => void;
}

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
      { onSuccess: closeAndReset }
    );
  };

  // Upgraded interactive wrapper for each form group
  const fieldWrapperClass = 
    "group/field flex flex-col gap-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-slate-300 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-50/50";
  
  const labelClass = "text-sm font-semibold text-slate-700 tracking-tight transition-colors group-focus-within/field:text-primary-600";

  return (
    <Modal
      open
      onClose={closeAndReset}
      icon={<ListTodo className="w-6 h-6 text-primary-500" />}
      title={<span className="text-xl font-bold text-slate-900">New todo task</span>}
      description={<span className="text-slate-500">A personal task, not assigned to anyone else.</span>}
      footer={
        <div className="flex w-full justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-5 py-2.5 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 rounded-lg transition-all duration-200 active:scale-95"
            onClick={closeAndReset}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="todo-form"
            variant="primary"
            size="sm"
            className="px-5 py-2.5 font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md rounded-lg transition-all duration-200 active:scale-95"
            isLoading={createMut.isPending}
          >
            Add task
          </Button>
        </div>
      }
    >
      <form id="todo-form" onSubmit={handleCreate} className="flex flex-col gap-4 py-2" noValidate>
        {/* Task Name Input */}
        <div
          className={`${fieldWrapperClass} ${error ? 'border-red-300 bg-red-50/30' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
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
            labelClassName={labelClass}
            containerClassName="w-full"
            className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 border-none p-0 focus:ring-0 ${
              error ? 'text-red-900 placeholder:text-red-300' : ''
            }`}
          />
        </div>

        {/* Due Date Selector */}
        <div
          className={`${fieldWrapperClass} animate-in fade-in slide-in-from-bottom-4 duration-500`}
          style={{ animationDelay: '75ms', animationFillMode: 'backwards' }}
        >
          <label className={labelClass}>
            Due date <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="No due date set"
            triggerClassName="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div
          className={`${fieldWrapperClass} animate-in fade-in slide-in-from-bottom-4 duration-500`}
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          <label className={labelClass}>Priority level</label>
          <div className="pt-1">
            <TaskFormPrioritySelector value={priority} onChange={setPriority} />
          </div>
        </div>
      </form>
    </Modal>
  );
};