import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

export const StatusPhotoThumbnail = ({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) => {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  
  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="group relative h-16 w-16 rounded-xl border border-border bg-surface-hover shrink-0 overflow-hidden transition-all hover:border-border-hover">
      {previewUrl && (
        <img 
          src={previewUrl} 
          alt={file.name} 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
        />
      )}
      
      {/* Overlay gradient for better button visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 p-1 rounded-full bg-surface text-text-muted hover:text-danger border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-background scale-90 hover:scale-100"
        aria-label={`Remove ${file.name}`}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
};