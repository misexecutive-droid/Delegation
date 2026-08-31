import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Store, Clock, AlertCircle } from 'lucide-react';
import { Skeleton, SelectDropdown } from '../../../components';
import { useStoresQuery, useAssignableUsersQuery, useChecklistInstancesBoardQuery } from '../hook';
import {
  formatDate, instanceProgressStatus, VERIFICATION_STATUS_LABEL, VERIFICATION_STATUS_STYLE,
  rateToneClass, rateBarClass, isInstanceOverdue,
} from '../checklistDisplay';
import type { ChecklistInstance, ChecklistInstanceStatus } from '../../../api/checklistInstances';

const STATUS_OPTIONS: { value: '' | ChecklistInstanceStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Not completed' },
  { value: 'COMPLETED', label: 'Completed' },
];

const SummaryTile = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="flex flex-col gap-1 p-4 rounded-lg border border-border bg-surface">
    <span className="text-xs font-display font-medium text-text-muted">{label}</span>
    <span className={`text-2xl font-display font-bold ${tone ?? 'text-text'}`}>{value}</span>
  </div>
);

interface ComplianceRowProps {
  instance: ChecklistInstance;
  storeName: string;
  nameById: Map<string, string>;
}

// One instance's roll-up: overall progress, plus a per-assignee breakdown of how many of this
// shared instance's items *that specific person* personally completed (via each item's
// completedBy) — the closest honest signal this schema supports for "did this person do their
// part," since items are completable by any assignee, not owned individually.
const ComplianceRow = ({ instance, storeName, nameById }: ComplianceRowProps) => {
  const total = instance.items.length;
  const done = instance.items.filter(i => i.isDone).length;
  const status = instanceProgressStatus(done, total);
  const progress = total ? Math.round((done / total) * 100) : 0;
  const overdue = isInstanceOverdue(instance.periodEnd, status === 'COMPLETED');

  return (
    <Link
      to={`/checklists/${instance.id}`}
      className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-surface hover:border-border-hover transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-display font-bold text-text">{instance.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted font-display flex-wrap">
            <span className="flex items-center gap-1"><Store size={11} /> {storeName}</span>
            <span>{formatDate(instance.periodStart)} – {formatDate(instance.periodEnd)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-display font-medium px-2 py-0.5 rounded-full border ${VERIFICATION_STATUS_STYLE[instance.verificationStatus]}`}>
            {VERIFICATION_STATUS_LABEL[instance.verificationStatus]}
          </span>
          {overdue && (
            <span className="flex items-center gap-1 text-xs font-display font-medium px-2 py-0.5 rounded-full bg-danger/10 text-danger">
              <Clock size={11} /> Overdue
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-surface-hover rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${rateBarClass(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs font-display font-medium shrink-0 ${rateToneClass(progress)}`}>{done}/{total}</span>
      </div>

      {instance.assigneeIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-dashed border-border/60">
          {instance.assigneeIds.map(id => {
            const completedByThem = instance.items.filter(i => i.completedBy === id).length;
            const allDone = total > 0 && completedByThem === total;
            const started = completedByThem > 0;
            return (
              <span
                key={id}
                className={`flex items-center gap-1 text-[11px] font-display font-medium px-2 py-0.5 rounded-full border ${
                  allDone
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : started
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-surface-hover text-text-muted border-border'
                }`}
              >
                {nameById.get(id) ?? 'Unknown'} · {completedByThem}/{total}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
};

// Admin-only dashboard answering "who has/hasn't filled their checklist" — dynamically filterable
// by store and by person. Spans every checklist definition's generated instances (unlike
// ChecklistDefinitionDetail, which only shows instances for one definition at a time).
export const ChecklistComplianceBoard = () => {
  const [storeId, setStoreId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<'' | ChecklistInstanceStatus>('');

  const { data: stores = [] } = useStoresQuery();
  // Scoped to the selected store, for the Person filter's own option list.
  const { data: people = [] } = useAssignableUsersQuery(undefined, storeId || undefined);
  // Unscoped roster so assignee chips resolve to real names even for instances outside whichever
  // store is currently selected in the filter above.
  const { data: allPeople = [] } = useAssignableUsersQuery();

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allPeople) map.set(p.id, `${p.firstName} ${p.lastName ?? ''}`.trim() || p.email);
    return map;
  }, [allPeople]);
  const storeNameById = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores]);

  const { data: instances = [], isPending, isError } = useChecklistInstancesBoardQuery({
    storeId: storeId || undefined,
    assigneeId: assigneeId || undefined,
    status: status || undefined,
  });

  const summary = useMemo(() => {
    const withStatus = instances.map(i => {
      const done = i.items.filter(x => x.isDone).length;
      const isComplete = instanceProgressStatus(done, i.items.length) === 'COMPLETED';
      return { isComplete, overdue: isInstanceOverdue(i.periodEnd, isComplete) };
    });
    return {
      total: instances.length,
      completed: withStatus.filter(i => i.isComplete).length,
      pending: withStatus.filter(i => !i.isComplete).length,
      overdue: withStatus.filter(i => i.overdue).length,
    };
  }, [instances]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Checklist Compliance</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Who's filled their checklist and who hasn't — filter by store and person.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 w-full sm:w-48">
          <label className="text-xs font-display font-medium text-text-secondary">Store</label>
          <SelectDropdown
            value={storeId}
            onChange={setStoreId}
            options={[{ value: '', label: 'All stores' }, ...stores.map(s => ({ value: s.id, label: s.name }))]}
            aria-label="Filter by store"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-48">
          <label className="text-xs font-display font-medium text-text-secondary">Person</label>
          <SelectDropdown
            value={assigneeId}
            onChange={setAssigneeId}
            options={[
              { value: '', label: 'All people' },
              ...people.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName ?? ''}`.trim() })),
            ]}
            aria-label="Filter by person"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-surface">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              aria-pressed={status === opt.value}
              className={`px-3 py-1.5 rounded-full text-xs font-display font-medium transition-all duration-200 cursor-pointer ${
                status === opt.value ? 'bg-primary-700 text-white shadow-sm' : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Instances" value={summary.total} />
        <SummaryTile label="Completed" value={summary.completed} tone="text-success" />
        <SummaryTile label="Not yet complete" value={summary.pending} tone="text-warning" />
        <SummaryTile label="Overdue" value={summary.overdue} tone="text-danger" />
      </div>

      {isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm font-display">
          <AlertCircle size={15} />
          Failed to load checklist compliance data.
        </div>
      )}

      {!isPending && !isError && instances.length === 0 && (
        <div className="p-10 text-center text-sm text-text-muted bg-surface rounded-xl border border-dashed border-border">
          No checklist instances match these filters.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {instances.map(instance => (
          <ComplianceRow
            key={instance.id}
            instance={instance}
            storeName={storeNameById.get(instance.storeId) ?? 'Unknown store'}
            nameById={nameById}
          />
        ))}
      </div>
    </div>
  );
};
