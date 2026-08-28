import { useRef } from 'react';
import { Paperclip, Image as ImageIcon, FileText } from 'lucide-react';
import { ACCEPTED_ATTACHMENT_TYPES } from './taskAttachmentDisplay';

const ICON_BTN_CLASS =
  'flex items-center justify-center size-8 rounded-lg text-text-light hover:text-primary-600 hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

interface AttachFilesToolbarProps {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
}

// The same three attach affordances (file / photo / document) as the Activity comment composer —
// used here too so adding a reference file to the delegation itself (in Create or Edit) is the
// same gesture as attaching one to a comment, not a separate drag-and-drop zone with its own UX.
export const AttachFilesToolbar = ({ onFiles, disabled }: AttachFilesToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-0.5">
      <input ref={fileInputRef} type="file" accept={ACCEPTED_ATTACHMENT_TYPES} multiple className="hidden" onChange={handleChange} />
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />

      <button type="button" title="Attach file" disabled={disabled} className={ICON_BTN_CLASS} onClick={() => fileInputRef.current?.click()}>
        <Paperclip size={15} />
      </button>
      <button type="button" title="Attach photo" disabled={disabled} className={ICON_BTN_CLASS} onClick={() => photoInputRef.current?.click()}>
        <ImageIcon size={15} />
      </button>
      <button type="button" title="Attach document" disabled={disabled} className={ICON_BTN_CLASS} onClick={() => fileInputRef.current?.click()}>
        <FileText size={15} />
      </button>
    </div>
  );
};
