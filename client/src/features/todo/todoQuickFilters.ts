import type { Todo } from '../../api/todos';
import type { TodoQuickFilterKey } from './TodoQuickStats';

export const isOverdueTodo = (t: Todo) => !!t.dueDate && !t.completed && new Date(t.dueDate).getTime() < Date.now();

// Same Pending/Completed/Due/Delayed semantics as the Delegation page's quick-stat predicates —
// "due" is anything with a due date that isn't done and isn't overdue yet, "delayed" is overdue.
// Shared between TodoPage (tile counts) and TodoList (actually filtering the rows) so the two
// can't drift apart.
export const TODO_QUICK_FILTER_PREDICATES: Record<TodoQuickFilterKey, (t: Todo) => boolean> = {
  pending: (t) => !t.completed,
  completed: (t) => t.completed,
  due: (t) => !!t.dueDate && !t.completed && !isOverdueTodo(t),
  delayed: isOverdueTodo,
};