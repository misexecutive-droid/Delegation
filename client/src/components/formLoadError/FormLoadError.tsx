import { AlertCircle } from 'lucide-react';
import { Modal } from '../modal';
import { Button } from '../button';

interface FormLoadErrorProps {
  onClose: () => void;
}

// Rendered in place of a lazy-loaded form (UserForm, DepartmentForm, ...) when its chunk fails to
// download — a real, closable dialog instead of leaving the user stuck behind an unclosable
// overlay on a flaky connection.
export const FormLoadError = ({ onClose }: FormLoadErrorProps) => (
  <Modal
    open
    onClose={onClose}
    icon={<AlertCircle className="w-5 h-5 text-danger" />}
    title="Couldn't load this form"
    description="Check your connection and try again."
    footer={
      <Button variant="primary" size="sm" onClick={onClose}>
        Close
      </Button>
    }
  >
    <p className="text-sm text-text-secondary font-display">
      This usually clears up on a retry — close this and reopen the form.
    </p>
  </Modal>
);
