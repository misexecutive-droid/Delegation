import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 gap-1.5 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden shadow-sm focus-visible:outline-none focus-visible:ring-4",
  {
    variants: {
      variant: {
        default:
          "border-primary-200 bg-primary-50 text-primary-700 [a&]:hover:bg-primary-100 focus-visible:ring-primary-50/50",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700 [a&]:hover:bg-slate-200 focus-visible:ring-slate-100/50",
        destructive:
          "border-red-200 bg-red-50 text-red-700 [a&]:hover:bg-red-100 focus-visible:ring-red-50/50",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 [a&]:hover:bg-emerald-100 focus-visible:ring-emerald-50/50",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 [a&]:hover:bg-amber-100 focus-visible:ring-amber-50/50",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 [a&]:hover:bg-blue-100 focus-visible:ring-blue-50/50",
        neutral:
          "border-slate-200 bg-slate-50 text-slate-500 [a&]:hover:bg-slate-100 focus-visible:ring-slate-50/50",
        outline:
          "border-slate-200 bg-white text-slate-600 [a&]:hover:bg-slate-50 focus-visible:ring-slate-100/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// badgeVariants is exported so other components can reuse the same variant classes (shadcn/ui
// convention); only affects Fast Refresh granularity, not runtime correctness.
// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }