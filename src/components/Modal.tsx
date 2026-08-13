import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconButton } from './Button'
import { cx } from './utils'

interface DialogFrameProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  closeLabel?: string
  variant: 'modal' | 'sheet'
  side?: 'left' | 'right'
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function DialogFrame({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeLabel = 'Close dialog',
  variant,
  side = 'right',
}: DialogFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const autoFocusTarget =
        panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')
      const firstFocusable =
        panelRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(autoFocusTarget ?? firstFocusable ?? panelRef.current)?.focus()
    })

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose, open])

  const panelInitial = reduceMotion
    ? { opacity: 1 }
    : variant === 'sheet'
      ? { opacity: 0, x: side === 'right' ? 28 : -28 }
      : { opacity: 0, y: 12, scale: 0.985 }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cx(
            'dialog-backdrop',
            variant === 'sheet' && `dialog-backdrop--sheet-${side}`,
          )}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={panelRef}
            className={cx(
              'dialog',
              `dialog--${variant}`,
              variant === 'sheet' && `dialog--sheet-${side}`,
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={panelInitial}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={panelInitial}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          >
            <header className="dialog__header">
              <div className="dialog__heading">
                <h2 className="dialog__title" id={titleId}>
                  {title}
                </h2>
                {description ? (
                  <p className="dialog__description" id={descriptionId}>
                    {description}
                  </p>
                ) : null}
              </div>
              <IconButton
                label={closeLabel}
                icon={X}
                variant="quiet"
                onClick={onClose}
              />
            </header>
            <div className="dialog__body">{children}</div>
            {footer ? <footer className="dialog__footer">{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export interface ModalProps
  extends Omit<DialogFrameProps, 'variant' | 'side'> {}

export function Modal(props: ModalProps) {
  return <DialogFrame {...props} variant="modal" />
}

export interface SheetProps extends Omit<DialogFrameProps, 'variant'> {
  side?: 'left' | 'right'
}

export function Sheet(props: SheetProps) {
  return <DialogFrame {...props} variant="sheet" />
}
