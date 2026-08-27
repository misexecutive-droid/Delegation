import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

function Popover({
  modal = false,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  // See Select/DropdownMenu's comment: defaulting to non-modal avoids the classic "nested inside
  // a Dialog" pointer-events lock conflict between Radix's modal primitives.
  return <PopoverPrimitive.Root data-slot="popover" modal={modal} {...props} />
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          // Same z-[80]-above-Dialog convention as dropdown-menu.tsx/select.tsx — this is the
          // primitive Combobox portals its own search-result list through, so it needs to escape
          // a Modal's own overflow clipping and render above it, not get cut off by it.
          //
          // Fade only, no zoom/slide: a scale+slide entrance on a field opening inside an already-
          // open modal reads as a second panel popping in on top of the first, not as "the list
          // appeared" — a quick plain fade is calm enough not to look like an extra popup while
          // still avoiding an instant, jarring snap.
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-100 z-[80] w-(--radix-popover-trigger-width) origin-(--radix-popover-content-transform-origin) rounded-xl border border-border p-0 shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent }
