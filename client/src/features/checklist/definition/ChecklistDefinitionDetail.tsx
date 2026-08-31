import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  AlertCircle,
  Repeat,
  Users,
  Calendar,
  Pencil,
  Gauge,
  Camera,
  Store,
  Clock,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { Skeleton, Breadcrumbs } from '../../../components';
import { Badge } from '@/components/ui/badge';
import { useChecklistDefinitionQuery, useInstancesForDefinitionQuery, useStoresQuery } from '../hook';
import { ChecklistInstanceRow } from '../instance/ChecklistInstanceRow';
import {
  formatDate,
  instanceProgressStatus,
  INSTANCE_STATUS_LABEL,
  rateToneClass,
  rateBarClass,
  RECURRENCE_LABEL,
  type InstanceProgressStatus,
} from '../checklistDisplay';
import type { ChecklistInstance } from '../../../api/checklistInstances';

const STATUS_ORDER: InstanceProgressStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

interface RateTileProps {
  icon: typeof Gauge;
  label: string;
  rate: number | null;
  emptyLabel: string;
}

const RateTile = ({ icon: Icon, label, rate, emptyLabel }: RateTileProps) => (
  <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-surface shadow-xs flex-1 min-w-[12rem] transition-all hover:shadow-sm">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
        <Icon size={14} className="text-text-muted" />
        {label}
      </span>
      {rate !== null && (
        <span className={`font-display text-xs font-bold ${rateToneClass(rate)}`}>
          {rate >= 80 ? 'Good' : rate >= 50 ? 'Fair' : 'Attention'}
        </span>
      )}
    </div>

    {rate !== null ? (
      <>
        <p className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${rateToneClass(rate)}`}>
          {rate}%
        </p>
        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-out ${rateBarClass(rate)}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </>
    ) : (
      <p className="text-xs font-display text-text-muted py-2 italic">{emptyLabel}</p>
    )}
  </div>
);

const groupByStatus = (instances: ChecklistInstance[]) =>
  STATUS_ORDER.map((status) => ({
    status,
    instances: instances.filter((i) => {
      const done = i.items.filter((x) => x.isDone).length;
      return instanceProgressStatus(done, i.items.length) === status;
    }),
  })).filter((group) => group.instances.length > 0);

export const ChecklistDefinitionDetail = () => {
  const { definitionId = '' } = useParams();
  const navigate = useNavigate();
  const { data: definition, isPending, isError } = useChecklistDefinitionQuery(definitionId);
  const { data: instances = [] } = useInstancesForDefinitionQuery(definitionId);
  const { data: stores = [] } = useStoresQuery();

  const storeNames = definition
    ? definition.storeIds
        .map((id) => stores.find((s) => s.id === id)?.name ?? 'Unknown store')
        .join(', ')
    : '';

  if (isPending) {
    return (
      <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto py-4">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !definition) {
    return (
      <div className="w-full max-w-4xl mx-auto py-6">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-display shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>Failed to load checklist details. Please check your network and try again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-2 sm:py-4">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'Checklists', to: '/admin/scheduled-checklists' },
          { label: definition.name },
        ]}
      />

      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/admin/scheduled-checklists')}
          className="inline-flex items-center gap-1.5 text-xs font-display font-medium text-text-secondary hover:text-text transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 rounded-md py-1 px-1.5"
        >
          <ArrowLeft size={14} />
          <span>Back to Templates</span>
        </button>

        <Link
          to={`/admin/scheduled-checklists/builder/${definition.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-display font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/60 shadow-2xs transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
        >
          <Pencil size={12} />
          <span>Edit in Builder</span>
        </Link>
      </div>

      {/* Main Overview Card */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-900/40 shadow-2xs shrink-0 mt-0.5">
              <Repeat size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-display font-bold text-text tracking-tight truncate">
                {definition.name}
              </h1>
              {definition.description ? (
                <p className="text-xs sm:text-sm font-display text-text-muted mt-1 leading-relaxed">
                  {definition.description}
                </p>
              ) : (
                <p className="text-xs font-display text-text-muted/70 italic mt-0.5">
                  No description provided.
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {definition.isActive ? (
            <Badge variant="outline" className="gap-1.5 text-[11px] py-1 px-2.5 shrink-0 bg-success/5 border-success/30 text-success">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-[11px] py-1 px-2.5 shrink-0 bg-muted/60 text-text-muted border-border">
              Paused
            </Badge>
          )}
        </div>

        {/* Metadata Badges & Tags */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-display text-text-secondary pt-4 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <Store size={13} className="text-text-muted shrink-0" />
            <span className="truncate max-w-xs">{storeNames || 'No stores'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Repeat size={13} className="text-text-muted shrink-0" />
            <span>{RECURRENCE_LABEL[definition.recurrence] ?? definition.recurrence}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-text-muted shrink-0" />
            <span>{definition.assigneeIds.length} assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-text-muted shrink-0" />
            <span>Starts {formatDate(definition.startDate)}</span>
          </div>
          <span className="ml-auto font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-text-muted border border-border/60">
            v{definition.version}
          </span>
        </div>
      </div>

      {/* Metric Rate Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RateTile
          icon={Gauge}
          label="Completion rate"
          rate={definition.completionRate}
          emptyLabel="No completed checklist runs recorded yet"
        />
        <RateTile
          icon={Camera}
          label="Photo compliance"
          rate={definition.qualityRate}
          emptyLabel="No photo-verification items attached"
        />
      </div>

      {/* Generated Instances Section */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
            Generated Instances ({instances.length})
          </h2>
        </div>

        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-10 px-4 rounded-xl border border-dashed border-border/80 bg-surface text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-text-muted">
              <ListTodo size={18} />
            </span>
            <p className="text-xs font-display font-medium text-text">No active instances yet</p>
            <p className="text-[11px] font-display text-text-muted max-w-xs">
              Runs will automatically generate according to the recurrence schedule ({RECURRENCE_LABEL[definition.recurrence] ?? definition.recurrence}).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groupByStatus(instances).map((group) => (
              <div key={group.status} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-bold text-text uppercase tracking-wider">
                    {INSTANCE_STATUS_LABEL[group.status]}
                  </span>
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-muted/70 text-text-muted border border-border/60">
                    {group.instances.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {group.instances.map((instance) => (
                    <ChecklistInstanceRow key={instance.id} instance={instance} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};