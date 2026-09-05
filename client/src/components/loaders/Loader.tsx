import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for intelligent Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Defines the dimensions and border thickness of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Dictates the color pairing for the track and the active spinning head */
  variant?: 'primary' | 'white' | 'slate' | 'rose';
}

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
  xl: 'size-12 border-[4px]', // Slightly thicker border for the XL size to maintain proportion
};

const variantClasses = {
  // Uses the primary theme colors to match your buttons and active states
  primary: 'border-primary-600/20 border-t-primary-600',
  // Crisp white for overlaying on dark gradients or primary buttons
  white: 'border-white/20 border-t-white',
  // Premium slate tones for neutral loading states (like the StatusPill) — theme tokens,
  // not raw slate, so this actually adapts in dark mode instead of staying near-invisible.
  slate: 'border-border border-t-text-muted',
  // Maps to the deep red used in your danger/delete actions
  rose: 'border-danger/20 border-t-danger',
};

export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ size = 'md', variant = 'primary', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "rounded-full animate-spin transition-all duration-300",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Loader.displayName = 'Loader';