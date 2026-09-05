import { lazy, Suspense, useState } from 'react';
import { Settings2, UserCheck, Send, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button, OptionsDialog, SortOptionRow, OptionRow, FilterGroup, FilterPill } from '../../components';
import { TaskFilterFields } from './TaskFilterFields';
import { SORT_LABEL, SORT_ICON, type TaskSortKey, type TaskFilters } from './taskFilters';
import { BOARD_GROUP_LABEL, BOARD_GROUP_ICON, type BoardGroupBy } from './taskBoardGroups';
import { CARD_FIELD_CONFIG, type CardFieldKey, type CardFieldVisibility } from './cardFields';
import type { AssignableUser } from '../../api/users';

const UserForm = lazy(() =>
  import('../admin/users/UserForm').then((m) => ({ default: m.UserForm })),
);

interface TaskOptionsDialogProps {
  isOpen:           boolean;
  setIsOpen:        (open: boolean) => void;
  filters:          TaskFilters;
  onChange:         (patch: Partial<TaskFilters>) => void;
  onClearAll:       () => void;
  activeCount:      number;
  sort:             TaskSortKey;
  onSortChange:     (key: TaskSortKey) => void;
  groupBy:          BoardGroupBy;
  onGroupByChange:  (key: BoardGroupBy) => void;
  fieldVisibility:  CardFieldVisibility;
  onToggleField:    (key: CardFieldKey) => void;
  assignableUsers?: AssignableUser[];
  isAdmin?:         boolean;
  canExport:        boolean;
  onExport:         () => void;
  /** Omitted when there's no signed-in user to scope by — the row is then not rendered at all. */
  scope?: {
    assignedToMe: boolean;
    raisedByMe:   boolean;
    onAssignedToMe: () => void;
    onRaisedByMe:   () => void;
  };
}

// Show/Sort/Fields/Category/Status/Priority/Assignee/Raised-by all live as rows in one
// dialog instead of a separate Filters popover plus two more toolbar dropdowns. The dialog shell
// and the Sort row are now the shared components/optionsDialog ones — this file owns only the
// rows that are specific to Delegation (the card-fields picker and the add-user flow).
export const TaskOptionsDialog = ({
  isOpen, setIsOpen, filters, onChange, onClearAll, activeCount,
  sort, onSortChange, groupBy, onGroupByChange, fieldVisibility, onToggleField,
  assignableUsers, isAdmin = false, canExport, onExport, scope,
}: TaskOptionsDialogProps) => {
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <>
      <OptionsDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Delegation options"
        activeCount={activeCount}
        onClearAll={onClearAll}
        canExport={canExport}
        onExport={onExport}
      >
        {/* Was a pair of pill tabs sitting loose under the page header. They're two more ways of
            narrowing the same list as every other row in here, so they live with the rest of them.
            "Everyone" is the resting state, made explicit rather than implied by neither tab
            being lit — you can now see what's selected without inferring it. */}
        {scope && (
          <OptionRow label="Show">
            <FilterGroup>
              <FilterPill
                active={!scope.assignedToMe && !scope.raisedByMe}
                onClick={() => {
                  if (scope.assignedToMe) scope.onAssignedToMe();
                  if (scope.raisedByMe) scope.onRaisedByMe();
                }}
              >
                <Users size={14} />
                Everyone
              </FilterPill>
              <FilterPill active={scope.assignedToMe} onClick={scope.onAssignedToMe}>
                <UserCheck size={14} />
                Assigned to me
              </FilterPill>
              <FilterPill active={scope.raisedByMe} onClick={scope.onRaisedByMe}>
                <Send size={13} />
                Assigned by me
              </FilterPill>
            </FilterGroup>
          </OptionRow>
        )}

        {/* What the board's columns represent. Only Status columns accept a dropped card — the
            other three are lenses on the same delegations, and a drop on a Department column would
            have to mean "reassign", a different decision entirely. Every card keeps its own
            "Move to" menu in all four, so no status change is ever out of reach. */}
        <OptionRow label="Group board by">
          <FilterGroup>
            {(Object.keys(BOARD_GROUP_LABEL) as BoardGroupBy[]).map((key) => {
              const Icon = BOARD_GROUP_ICON[key];
              return (
                <FilterPill key={key} active={groupBy === key} onClick={() => onGroupByChange(key)}>
                  <Icon size={14} />
                  {BOARD_GROUP_LABEL[key]}
                </FilterPill>
              );
            })}
          </FilterGroup>
        </OptionRow>

        <SortOptionRow labels={SORT_LABEL} icons={SORT_ICON} value={sort} onChange={onSortChange} />

        <OptionRow label="Fields">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-9 px-3 gap-2 border border-border/60 rounded-lg w-fit">
                <Settings2 size={14} className="text-text-muted" />
                <span className="text-xs font-medium">Customize cards</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl">
              <DropdownMenuLabel className="text-xs text-text-muted font-medium tracking-tight">Show only</DropdownMenuLabel>
              {CARD_FIELD_CONFIG.map(({ key, label, icon: Icon }) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={fieldVisibility[key]}
                  onCheckedChange={() => onToggleField(key)}
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2.5 py-2 cursor-pointer"
                >
                  <Icon size={14} className="text-text-muted" />
                  <span className="font-medium text-sm">{label}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </OptionRow>

        <TaskFilterFields
          filters={filters}
          onChange={onChange}
          assignableUsers={assignableUsers}
          isAdmin={isAdmin}
          onAddUser={() => { setShowAddUser(true); setIsOpen(false); }}
        />
      </OptionsDialog>

      {showAddUser && (
        <Suspense fallback={null}>
          <UserForm onClose={() => setShowAddUser(false)} />
        </Suspense>
      )}
    </>
  );
};
