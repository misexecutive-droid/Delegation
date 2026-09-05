import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, AlertCircle, ClipboardList, FileDown, Upload } from 'lucide-react';
import { Button, Skeleton } from '../../../components';
import { Badge } from '@/components/ui/badge';
import { useChecklistDefinitionsQuery } from '../hook';
import { ChecklistDefinitionCard } from './ChecklistDefinitionCard';
import { ChecklistBulkImportModal } from './bulkImport/ChecklistBulkImportModal';
import { ExportDialog } from '../../reports';

interface ChecklistTemplatesGridProps {
  className?: string;
}

export const ChecklistTemplatesGrid = ({ className = '' }: ChecklistTemplatesGridProps) => {
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { data: definitions = [], isPending, isError } = useChecklistDefinitionsQuery();

  return (
    <div className={`flex flex-col gap-6 w-full ${className}`}>
      {/* Header & Page Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-text tracking-tight">
              Checklist Templates
            </h1>
            {!isPending && !isError && (
              <Badge variant="outline" className="font-mono text-xs py-0.5 px-2 font-semibold">
                {definitions.length}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm font-display text-text-muted leading-relaxed max-w-2xl">
            Question sets, proof rules and versions — recurring checklists deployed across your stores.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 text-xs font-display font-medium"
            onClick={() => setShowExport(true)}
          >
            <FileDown size={14} className="text-text-muted" />
            <span>Export</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 text-xs font-display font-medium"
            onClick={() => setShowBulkImport(true)}
          >
            <Upload size={14} className="text-text-muted" />
            <span>Import</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5 text-xs font-display font-medium"
            onClick={() => navigate('/admin/scheduled-checklists/builder')}
          >
            <Plus size={14} />
            <span>New checklist</span>
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-5 rounded-lg border border-border bg-surface"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {isError && (
        <div
          role="alert"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-display shadow-xs"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>Failed to load checklist templates. Please check your connection and try again.</span>
        </div>
      )}

      {/* Empty State */}
      {!isPending && !isError && definitions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-border/70 rounded-xl bg-surface/30 text-center">
          <span className="flex items-center justify-center size-12 rounded-lg border border-border/60 bg-muted/60 text-text-muted mb-4">
            <ClipboardList className="size-6" strokeWidth={2.25} />
          </span>
          <h2 className="text-base sm:text-lg font-display font-bold text-text mb-1.5">
            No checklist templates yet
          </h2>
          <p className="text-xs sm:text-sm font-display text-text-muted max-w-sm mb-6 leading-relaxed">
            Create your first recurring checklist to standardize procedures, quality audits, and safety checks across your store fleet.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/scheduled-checklists/builder')}
            className="gap-1.5 text-xs sm:text-sm font-display font-medium"
          >
            <Plus size={15} />
            <span>Create new checklist</span>
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      {!isPending && !isError && definitions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {definitions.map((d) => (
            <ChecklistDefinitionCard key={d.id} definition={d} />
          ))}
        </div>
      )}

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          reportModule="checklists"
          title="Export Checklists"
          description="Every recurring checklist instance generated in the selected period — completion progress per instance."
          onClose={() => setShowExport(false)}
        />
      )}

      <ChecklistBulkImportModal open={showBulkImport} onClose={() => setShowBulkImport(false)} />
    </div>
  );
};