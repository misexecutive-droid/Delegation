import { Users, UserCheck } from 'lucide-react';
import { UserMultiSelect } from '../../../../components';
import { LABEL_CLASS } from './formConstants';

interface ChecklistAssigneesFieldProps {
  storeId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export const ChecklistAssigneesField = ({
  storeId,
  selected,
  onChange,
  className = '',
}: ChecklistAssigneesFieldProps) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
    {/* Field Header & Count Badge */}
    <div className="flex items-center justify-between gap-2">
      <label className={`${LABEL_CLASS} flex items-center gap-1.5 cursor-pointer`}>
        <Users size={14} className="text-text-muted shrink-0" />
        <span>Assigned Users</span>
      </label>

      {selected.length > 0 && (
        <span className="text-[11px] font-display font-medium text-text-muted flex items-center gap-1">
          <UserCheck size={12} className="text-primary-700 dark:text-primary-400" />
          <span>{selected.length} assigned</span>
        </span>
      )}
    </div>

    {/* Multi-Select Input */}
    <UserMultiSelect
      storeId={storeId || undefined}
      selected={selected}
      onChange={onChange}
    />

    {/* Helper Subtext */}
    <p className="text-[11px] font-display text-text-muted">
      Select specific store team members responsible for completing this checklist.
    </p>
  </div>
);