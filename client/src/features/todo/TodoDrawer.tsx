import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ListTodo, Plus } from 'lucide-react';
import { GradientIconTile } from '../../components';
import { TodoList } from './TodoList';
import { CreateTodoModal } from './CreateTodoModal';

interface TodoDrawerProps {
  open: boolean;
  onClose: () => void;
}

// A right-side slide-in panel for the Dashboard's "Todo Task" shortcut — shows the existing list
// right away instead of jumping straight to a blank add-task form; "Add todo" inside it opens the
// same CreateTodoModal used everywhere else.
export const TodoDrawer = ({ open, onClose }: TodoDrawerProps) => {
  const [showCreate, setShowCreate] = useState(false);

  // Portalled to <body> — DashboardHeader (where this is triggered from) has `overflow-hidden` on
  // its own root div for the LightBeams effect, which would otherwise clip this fixed-position
  // panel to the header's own bounding box instead of the full viewport.
  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your to-do list"
        aria-hidden={!open}
        className={`fixed top-0 bottom-0 right-0 z-[60] w-full sm:w-96 max-w-[90vw] bg-surface border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <GradientIconTile icon={ListTodo} size="sm" />
            <div className="min-w-0">
              <h2 className="text-sm font-display font-semibold text-text truncate">Your To-Do List</h2>
              <p className="text-xs text-text-muted truncate">Personal tasks, just for you</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-full text-text-light hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 pb-24">
          <TodoList />
        </div>

        {/* Pinned to the panel's own bottom-right corner (not the button that opens this drawer)
            so it stays reachable no matter how far the list above it is scrolled. */}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          aria-label="Add todo"
          title="Add todo"
          className="absolute bottom-5 right-5 z-10 flex items-center justify-center size-12 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </aside>

      <CreateTodoModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>,
    document.body,
  );
};
