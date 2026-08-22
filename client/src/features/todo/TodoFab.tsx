import { useState } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { Fab } from '../../components/fab';
import { CreateTodoModal } from './CreateTodoModal';

interface TodoFabProps {
  /** Opens the shared To-Do drawer (its state/instance lives in the parent, e.g. HomePage, so
   *  the desktop header button and this mobile FAB's "View Todos" action stay in sync). */
  onOpenDrawer: () => void;
}

// A mobile-only speed-dial FAB: tapping the main "+" reveals two labeled sub-actions instead of
// jumping straight into one flow, since "view what I already have" and "add something new" are
// both common enough here to deserve their own one-tap target.
export const TodoFab = ({ onOpenDrawer }: TodoFabProps) => {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <Fab
        actions={[
          { key: 'view', label: 'View Todos', icon: ListTodo, onClick: onOpenDrawer },
          { key: 'add', label: 'Add Todo', icon: Plus, onClick: () => setShowCreate(true) },
        ]}
      />
      <CreateTodoModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};
