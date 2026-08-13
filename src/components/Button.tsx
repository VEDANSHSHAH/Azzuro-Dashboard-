import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cx } from './utils'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: LucideIcon
  trailingIcon?: LucideIcon
  isLoading?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    isLoading = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('button', `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <LoaderCircle className="button__icon button__spinner" aria-hidden="true" />
      ) : LeadingIcon ? (
        <LeadingIcon className="button__icon" aria-hidden="true" />
      ) : null}
      <span className="button__label">{children}</span>
      {TrailingIcon ? (
        <TrailingIcon className="button__icon" aria-hidden="true" />
      ) : null}
    </button>
  )
})

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string
  icon: LucideIcon
  variant?: 'default' | 'quiet' | 'on-dark' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon: Icon,
      variant = 'default',
      size = 'md',
      className,
      title,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'icon-button',
          `icon-button--${variant}`,
          `icon-button--${size}`,
          className,
        )}
        aria-label={label}
        title={title ?? label}
        {...props}
      >
        <Icon aria-hidden="true" />
      </button>
    )
  },
)
