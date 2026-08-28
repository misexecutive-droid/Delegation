import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { attachmentIconFor, formatFileSize, isImageAttachment } from './taskAttachmentDisplay';

interface StagedFileChipsProps {
  files: File[];
  onRemove: (index: number) => void;
}

// Preview chips for files picked but not yet uploaded — shared by the comment composer and the
// Create-delegation form's own attach toolbar, both of which stage files locally until the actual
// submit (there's no task/comment id to upload against until then).
export const StagedFileChips = ({ files, onRemove }: StagedFileChipsProps) => {
  const previewUrls = useMemo(
    () => files.map((f) => (isImageAttachment(f.type) ? URL.createObjectURL(f) : '')),
    [files]
  );
  useEffect(() => () => previewUrls.forEach((u) => u && URL.revokeObjectURL(u)), [previewUrls]);

  if (!files.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => {
        const Icon = attachmentIconFor(f.type);
        return (
          <span key={i} className="flex items-center gap-1.5 text-xs bg-surface-hover border border-border rounded-full pl-1.5 pr-1.5 py-1">
            {previewUrls[i] ? (
              <img src={previewUrls[i]} alt="" className="size-5 rounded-full object-cover shrink-0" />
            ) : (
              <Icon size={14} className="text-text-light shrink-0" />
            )}
            <span className="font-medium text-text">{f.name}</span>
            <span className="text-text-light">({formatFileSize(f.size)})</span>
            <button type="button" onClick={() => onRemove(i)} className="text-text-light hover:text-danger cursor-pointer">
              <X size={12} />
            </button>
          </span>
        );
      })}
    </div>
  );
};
