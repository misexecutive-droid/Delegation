import { forwardRef, type ReactNode, type InputHTMLAttributes } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  suffix?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  containerClassName?: string;
  labelClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      id,
      className,
      suffix,
      icon: Icon,
      iconClassName,
      containerClassName,
      labelClassName,
      ...props
    },
    ref
  ) => {
    const errorId = error && id ? `${id}-error` : undefined;

    return (
      <div className={cn("group/input flex flex-col gap-1.5 w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors duration-200 group-focus-within/input:text-primary-600 px-1",
              labelClassName
            )}
          >
            {Icon && (
              <Icon
                className={cn("w-3.5 h-3.5 text-slate-400 group-focus-within/input:text-primary-500 transition-colors", iconClassName)}
                strokeWidth={2.5}
              />
            )}
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative flex items-center group">
          <input
            id={id}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={cn(
              // text-base (16px) below sm: iOS Safari auto-zooms the viewport on focusing any
              // input smaller than 16px, which text-sm's 14px would otherwise trigger.
              "w-full h-11 rounded-xl border px-3.5 text-base sm:text-sm font-medium transition-all duration-200",
              "bg-slate-50 text-slate-900 placeholder:text-slate-400",
              "hover:border-slate-300 hover:bg-slate-100/50",
              "focus:bg-white focus:outline-none focus:ring-4",
              "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200",
              suffix && "pr-11",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50 bg-red-50/30"
                : "border-slate-200 focus:border-primary-400 focus:ring-primary-50/50",
              className
            )}
            {...props}
          />

          {/* Suffix / Action */}
          {suffix && (
            <div className={cn(
              "absolute right-3 flex items-center justify-center transition-colors duration-200",
              "text-slate-400 group-focus-within:text-primary-600",
              error && "text-red-500 group-focus-within:text-red-600"
            )}>
              {suffix}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 animate-in slide-in-from-top-1 fade-in duration-200 px-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";