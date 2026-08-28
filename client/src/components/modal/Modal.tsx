import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SIZE_CLASS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-4xl',
  '3xl': 'sm:max-w-5xl',
  '4xl': 'sm:max-w-6xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  footer?: ReactNode;
  showCloseButton?: boolean;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  /** Set false for a modal that's expected to open on top of another Modal (e.g. a date picker
   *  inside a form modal). Radix's default modal behavior (focus trap + body scroll-lock) isn't
   *  aware of a second Dialog also managing that same lock, and closing the inner one first can
   *  leave the outer one's body lock in a broken, unclickable state — non-modal sidesteps that
   *  since only one Dialog in the stack is then managing the lock. */
  modal?: boolean;
  children: ReactNode;
}

export const Modal = ({
  open,
  onClose,
  title,
  description,
  icon,
  size = 'md',
  footer,
  showCloseButton = true,
  contentClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  modal = true,
  children,
}: ModalProps) => (
  <Dialog 
    open={open} 
    onOpenChange={(next) => { 
      if (!next) onClose(); 
    }} 
    modal={modal}
  >
    <DialogContent
      showCloseButton={false}
      className={cn('w-full sm:w-[95vw]', SIZE_CLASS[size], 'p-0 flex flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:rounded max-h-[90vh]', contentClassName)}
    >
      <div className={cn('flex items-start justify-between gap-3 shrink-0 px-5 py-3.5 border-b border-border/40', headerClassName)}>
        
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
          <div className="min-w-0">
            <DialogTitle className="truncate">{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              // Satisfies Radix accessibility requirement when description is undefined
              <DialogDescription className="sr-only" />
            )}
          </div>
        </div>

        {showCloseButton && (
          <DialogClose
            className="shrink-0 p-1.5 rounded-full text-text-light hover:text-text hover:bg-surface-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </DialogClose>
        )}
      </div>

      <div
        className={cn(
          'flex flex-col gap-5 px-5 py-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0',
          !footer && 'pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4',
          bodyClassName,
        )}
      >
        {children}
      </div>

      {footer && (
        <div
          className={cn(
            'shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-3.5 bg-surface-hover/40 border-t border-border/40',
            footerClassName,
          )}
        >
          {footer}
        </div>
      )}
    </DialogContent>
  </Dialog>
);