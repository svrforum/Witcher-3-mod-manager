import { useEffect } from 'react'
import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = ++nextId
    // Also log to console for debugging
    if (type === 'error') {
      console.error('[Toast Error]', message)
    } else {
      console.log(`[Toast ${type}]`, message)
    }
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))

const typeConfig: Record<Toast['type'], { bg: string; icon: string; iconColor: string }> = {
  success: {
    bg: 'bg-green-900/80 border-green-700/50',
    icon: '\u2713',
    iconColor: 'text-green-400'
  },
  error: {
    bg: 'bg-red-900/80 border-red-700/50',
    icon: '\u2715',
    iconColor: 'text-red-400'
  },
  info: {
    bg: 'bg-witcher-card/90 border-witcher-border/50',
    icon: '\u2139',
    iconColor: 'text-witcher-gold'
  }
}

function ToastItem({ toast }: { toast: Toast }): JSX.Element {
  const removeToast = useToastStore((s) => s.removeToast)
  const config = typeConfig[toast.type]

  useEffect(() => {
    return () => {}
  }, [])

  const handleCopyError = (): void => {
    navigator.clipboard.writeText(toast.message).catch(() => {})
  }

  return (
    <div
      className={`px-4 py-3 rounded-xl border text-sm text-witcher-text shadow-2xl min-w-72 max-w-96 animate-slide-in-top backdrop-blur-md ${config.bg}`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-base leading-none mt-0.5 ${config.iconColor}`}>{config.icon}</span>
        <span className="flex-1 leading-relaxed">{toast.message}</span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {toast.type === 'error' && (
            <button
              onClick={handleCopyError}
              className="text-witcher-text-muted/60 hover:text-witcher-text text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors-smooth"
              title="Copy error"
            >
              Copy
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-witcher-text-muted/40 hover:text-witcher-text text-xs px-1 transition-colors-smooth"
          >
            &#x2715;
          </button>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed top-3 right-3 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
