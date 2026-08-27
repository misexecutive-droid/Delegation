import { useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '../../components/button';
import { LightBeams } from '../../components/lightBeams';
import { TodoDrawer } from '../todo';
import { greeting } from './dashboardDisplay';

export const DashboardHeader = ({ userName }: { userName?: string }) => {
  const [showTodoDrawer, setShowTodoDrawer] = useState(false);
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative isolate overflow-hidden flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-2 py-1">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-text tracking-tight">
          {greeting()}
          {userName ? (
            <span className="text-primary-500">, {userName}</span>
          ) : (
            ''
          )}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          className="group w-full sm:w-auto rounded-xl font-display"
          onClick={() => setShowTodoDrawer(true)}
        >
          <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
          Todo Task
        </Button>
      </div>

      <TodoDrawer open={showTodoDrawer} onClose={() => setShowTodoDrawer(false)} />
    </div>
  );
};