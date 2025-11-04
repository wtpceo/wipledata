import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToasterToast extends Toast {
  onOpenChange?: (open: boolean) => void
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToasterToast[]>([])

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = `toast-${toastCount++}`
      const newToast: ToasterToast = {
        id,
        title,
        description,
        variant,
      }

      setToasts((prev) => [...prev, newToast])

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)

      return {
        id,
        dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      }
    },
    []
  )

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    } else {
      setToasts([])
    }
  }, [])

  return {
    toast,
    dismiss,
    toasts,
  }
}
