import { useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CloudOff,
  Info,
  LoaderCircle,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconButton } from './Button'
import { cx } from './utils'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface SaveIndicatorProps {
  state: SaveState
  savedLabel?: string
  className?: string
}

export function SaveIndicator({
  state,
  savedLabel = 'Saved',
  className,
}: SaveIndicatorProps) {
  const config: Record<SaveState, { label: string; icon: LucideIcon }> = {
    idle: { label: 'Ready', icon: Check },
    saving: { label: 'Saving…', icon: LoaderCircle },
    saved: { label: savedLabel, icon: CheckCircle2 },
    error: { label: 'Could not save', icon: CloudOff },
  }
  const current = config[state]
  const Icon = current.icon

  return (
    <span
      className={cx(
        'save-indicator',
        `save-indicator--${state}`,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cx(
          'save-indicator__icon',
          state === 'saving' && 'save-indicator__icon--spinning',
        )}
        aria-hidden="true"
      />
      {current.label}
    </span>
  )
}

export type ToastTone = 'success' | 'info' | 'error'

export interface ToastMessage {
  id: string
  title: string
  description?: ReactNode
  tone?: ToastTone
  duration?: number
}

export interface ToastViewportProps {
  toasts: readonly ToastMessage[]
  onDismiss: (id: string) => void
  className?: string
}

const toastIcons: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const tone = toast.tone ?? 'info'
  const Icon = toastIcons[tone]
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (toast.duration === 0) return
    const timeout = window.setTimeout(
      () => onDismiss(toast.id),
      toast.duration ?? 4200,
    )
    return () => window.clearTimeout(timeout)
  }, [onDismiss, toast.duration, toast.id])

  return (
    <motion.div
      className={cx('toast', `toast--${tone}`)}
      role={tone === 'error' ? 'alert' : 'status'}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
    >
      <Icon className="toast__icon" aria-hidden="true" />
      <div className="toast__content">
        <p className="toast__title">{toast.title}</p>
        {toast.description ? (
          <div className="toast__description">{toast.description}</div>
        ) : null}
      </div>
      <IconButton
        className="toast__close"
        label="Dismiss notification"
        icon={X}
        variant="quiet"
        size="sm"
        onClick={() => onDismiss(toast.id)}
      />
    </motion.div>
  )
}

export function ToastViewport({
  toasts,
  onDismiss,
  className,
}: ToastViewportProps) {
  return (
    <div
      className={cx('toast-viewport', className)}
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
