import React from "react";
import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Utility for intelligent Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: React.ReactNode;
  error?: string;
  success?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  containerClassName?: string;
  labelClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      success,
      id,
      className,
      rows = 4,
      icon: Icon,
      iconClassName,
      containerClassName,
      labelClassName,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID for aria-describedby if validation messages exist
    const messageId = (error || success) && id ? `${id}-message` : undefined;
    const isError = !!error;
    const isSuccess = !error && !!success;

    return (
      <div className={cn("group/field flex flex-col gap-1.5 w-full", containerClassName)}>
        {/* Label */}
        <label
          htmlFor={id}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors duration-200 group-focus-within/field:text-primary-600 px-1",
            labelClassName
          )}
        >
          {Icon && (
            <Icon
              className={cn("w-3.5 h-3.5 text-slate-400 group-focus-within/field:text-primary-500 transition-colors", iconClassName)}
              strokeWidth={2.5}
            />
          )}
          {label}
        </label>

        {/* Textarea Field */}
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          aria-invalid={isError}
          aria-describedby={messageId}
          className={cn(
            // text-base (16px) below sm: iOS Safari auto-zooms the viewport on focusing any
            // input smaller than 16px, which text-sm's 14px would otherwise trigger.
            "w-full px-3.5 py-3 min-h-[100px] text-base sm:text-sm font-medium transition-all duration-200 ease-out resize-y",
            "bg-slate-50 text-slate-900 placeholder:text-slate-400",
            "border rounded-xl outline-none appearance-none",
            "hover:border-slate-300 hover:bg-slate-100/50",
            "focus:bg-white focus:outline-none focus:ring-4",
            "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:resize-none",
            isError
              ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50 bg-red-50/30"
              : isSuccess
              ? "border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 bg-emerald-50/30"
              : "border-slate-200 focus:border-primary-400 focus:ring-primary-50/50",
            className
          )}
          {...props}
        />

        {/* Validation Messages */}
        {(isError || isSuccess) && (
          <p
            id={messageId}
            role="alert"
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold animate-in slide-in-from-top-1 fade-in duration-200 px-1",
              isError ? "text-red-500" : "text-emerald-500"
            )}
          >
            {isError ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            )}
            {error || success}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";