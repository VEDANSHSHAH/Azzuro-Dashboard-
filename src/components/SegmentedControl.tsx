import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cx } from './utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const controlId = useId()
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={cx(
        'segmented-control',
        `segmented-control--${size}`,
        className,
      )}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const Icon = option.icon
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            className={cx(
              'segmented-control__item',
              isActive && 'segmented-control__item--active',
            )}
            aria-pressed={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {isActive ? (
              <motion.span
                className="segmented-control__highlight"
                layoutId={`segmented-highlight-${controlId}`}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 500, damping: 36 }
                }
              />
            ) : null}
            <span className="segmented-control__content">
              {Icon ? <Icon aria-hidden="true" /> : null}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
