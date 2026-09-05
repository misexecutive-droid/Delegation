import { RefreshCcw, Camera, ImageUp, AlertCircle } from 'lucide-react';
import { Button } from '../../../components';
import { STATUS_UPDATE_OPTIONS } from './detailConstants';
import { StatusPhotoThumbnail } from './StatusPhotoThumbnail';
import type { RestrictedStatus, CaptureMethod } from '../../../api/ticket';

interface TicketStatusUpdatePanelProps {
  statusPick: RestrictedStatus | null;
  onPickStatus: (status: RestrictedStatus) => void;
  statusRemark: string;
  onRemarkChange: (value: string) => void;
  statusPhotos: File[];
  onRemovePhoto: (index: number) => void;
  onAddPhotos: (files: FileList | null, method: CaptureMethod) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
}

export const TicketStatusUpdatePanel = ({
  statusPick,
  onPickStatus,
  statusRemark,
  onRemarkChange,
  statusPhotos,
  onRemovePhoto,
  onAddPhotos,
  onSubmit,
  isSubmitting,
  submitErrorMessage,
}: TicketStatusUpdatePanelProps) => {
  const isSubmitDisabled = !statusPick || !statusRemark.trim() || isSubmitting;

  return (
    <div className="px-6 py-5 border-t border-border bg-surface-hover/90 backdrop-blur-xl flex flex-col gap-4 font-sans shadow-[0_-10px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.2)] pb-safe">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-secondary">
        <RefreshCcw size={16} className="text-primary-500" strokeWidth={2.5} />
        <span>Update Status</span>
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {STATUS_UPDATE_OPTIONS.map((opt) => {
          const isSelected = statusPick === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPickStatus(opt.value)}
              className={`text-sm font-bold px-3 py-2.5 rounded-xl border transition-all text-center outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-95 ${
                isSelected
                  ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-sm ring-1 ring-primary-500/20'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text shadow-sm'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={statusRemark}
        onChange={(e) => onRemarkChange(e.target.value)}
        placeholder="Remark — explain what changed... (required)"
        rows={3}
        className="w-full px-4 py-3 text-sm font-medium bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-text placeholder:text-text-light resize-none transition-all shadow-inner"
      />

      {statusPhotos.length > 0 && (
        <div className="flex flex-wrap gap-3 p-3 bg-surface border border-border rounded-xl shadow-sm">
          {statusPhotos.map((file, index) => (
            <StatusPhotoThumbnail
              key={`${file.name}-${file.lastModified}-${index}`}
              file={file}
              index={index}
              onRemove={onRemovePhoto}
            />
          ))}
        </div>
      )}

      {submitErrorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={16} className="shrink-0" strokeWidth={2.5} />
          <span>{submitErrorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 mt-1 border-t border-border pt-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-primary-500/30 text-primary-700 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1 focus-within:ring-offset-background shadow-sm active:scale-95">
            <Camera size={16} strokeWidth={2.5} />
            <span>Camera</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                onAddPhotos(e.target.files, 'LIVE');
                e.target.value = '';
              }}
            />
          </label>

          <label className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-border text-text-secondary bg-surface hover:bg-surface-hover cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1 focus-within:ring-offset-background shadow-sm active:scale-95">
            <ImageUp size={16} strokeWidth={2.5} />
            <span>Gallery</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                onAddPhotos(e.target.files, 'GALLERY');
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <Button
          size="sm"
          variant="primary"
          className="w-full sm:w-auto font-bold text-sm gap-2 px-5 py-2.5 rounded-xl shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:shadow-none active:scale-95"
          disabled={isSubmitDisabled}
          isLoading={isSubmitting}
          onClick={onSubmit}
        >
          Submit update
        </Button>
      </div>
    </div>
  );
};