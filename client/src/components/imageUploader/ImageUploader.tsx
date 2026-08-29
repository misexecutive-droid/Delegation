import { useRef, useState, useEffect, useMemo, type DragEvent, type KeyboardEvent } from 'react';
import { UploadCloud, X, ImageOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageUploaderProps {
  label?: string;
  hint?: string;
  files: File[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  accept?: string;
  multiple?: boolean;
}

function ImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // A failed/broken <img> falls back to browser-native alt-text rendering, which doesn't reliably
  // respect this container's own sizing/overflow-hidden — swapping to a fully custom, correctly
  // contained fallback avoids that instead of fighting the browser's own broken-image layout.
  const [failed, setFailed] = useState(false);

  return (
    <div className="group relative aspect-square rounded-xl border border-border overflow-hidden bg-surface-hover shrink-0 shadow-sm transition-all duration-300 hover:shadow-md animate-in fade-in zoom-in-95">
      {url && !failed ? (
        <img
          src={url}
          alt={file.name}
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="size-full flex flex-col items-center justify-center gap-1.5 p-2 text-text-light">
          <ImageOff size={18} strokeWidth={1.75} />
          <span className="text-[10px] font-medium text-text-muted text-center leading-tight line-clamp-2 break-words">
            {file.name}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 cursor-pointer",
          "bg-surface/90 backdrop-blur-md border border-border/50 shadow-sm",
          "text-text-muted hover:text-danger hover:bg-surface",
          "opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-90"
        )}
        aria-label={`Remove ${file.name}`}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ImageUploader({
  label = 'Images',
  hint = 'PNG, JPG, WebP up to 10MB',
  files,
  onAdd,
  onRemove,
  accept = 'image/*',
  multiple = true,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const stop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex flex-col gap-2 w-full group/uploader">
      {label && (
        <label className="block text-[11px] font-bold text-text-muted transition-colors duration-200 group-focus-within/uploader:text-primary-600 px-1">
          {label}
        </label>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          stop(e);
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          stop(e);
          setIsDragging(false);
        }}
        onDrop={(e) => {
          stop(e);
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) onAdd(e.dataTransfer.files);
        }}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-4 focus:ring-primary-50/50 active:scale-[0.99]',
          isDragging
            ? 'border-primary-400 bg-primary-50/50 shadow-inner'
            : 'border-border bg-surface-hover hover:bg-surface-active/50 hover:border-border-hover'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAdd(e.target.files);
            }
            e.target.value = ''; // Reset so the same file can be uploaded again if removed
          }}
        />

        {/* Floating Icon Tile */}
        <div
          className={cn(
            "flex items-center justify-center size-12 rounded-xl bg-surface shadow-sm ring-1 ring-border/50 transition-all duration-300",
            isDragging
              ? "text-primary-600 scale-110 shadow-md shadow-primary-600/10 ring-primary-100"
              : "text-text-light group-hover:text-primary-600 group-hover:-translate-y-1 group-hover:shadow-md"
          )}
        >
          <UploadCloud size={24} strokeWidth={2.5} />
        </div>

        <div>
          <p className="text-sm font-bold text-text-secondary transition-colors group-hover:text-text">
            Drag &amp; drop files here
          </p>
          <p className="text-xs font-medium text-text-muted mt-1.5 transition-colors">
            {hint} or{' '}
            <span className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
              browse
            </span>
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 mt-3">
          {files.map((file, i) => (
            <ImagePreview
              key={`${file.name}-${file.lastModified}-${i}`}
              file={file}
              onRemove={() => onRemove(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}