import { useEffect, type CSSProperties } from "react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

import { useTheme } from "@/context/ThemeContext"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-sonner-toast]")) {
        toast.dismiss()
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-lg",
          title: "font-display font-semibold",
          description: "!text-text-muted",
          closeButton: "!bg-surface !border-border !text-text-light hover:!text-text hover:!bg-surface-hover",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-text)",
          "--normal-border": "var(--color-border)",
          "--success-bg": "var(--color-surface)",
          "--success-text": "var(--color-success)",
          "--success-border": "var(--color-success)",
          "--error-bg": "var(--color-surface)",
          "--error-text": "var(--color-danger)",
          "--error-border": "var(--color-danger)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
