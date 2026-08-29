import { AlertCircle } from 'lucide-react';
import { Modal } from '../modal';
import { Button } from '../button';

interface FormLoadErrorProps {
  onClose: () => void;
}

export const FormLoadError = ({ onClose }: FormLoadErrorProps) => (
  <Modal
    open
    onClose={onClose}
    icon={<AlertCircle className="size-6 text-red-500" strokeWidth={2.5} />}
    title={<span className="text-xl font-bold text-slate-900 tracking-tight">Couldn't load this form</span>}
    description={<span className="text-sm font-medium text-slate-500">Check your connection and try again.</span>}
    footer={
      <div className="flex w-full justify-end pt-2">
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-slate-900/10 active:scale-95 transition-all duration-200"
        >
          Close
        </Button>
      </div>
    }
  >
    <div className="p-4 mt-2 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner shadow-slate-100/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[14px] leading-relaxed text-slate-600 font-medium">
        This usually clears up on a retry — close this and reopen the form.
      </p>
    </div>
  </Modal>
);