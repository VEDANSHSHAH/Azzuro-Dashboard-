import { forwardRef, useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './utils'

export interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cx('field', error && 'field--error', className)}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="field__required" aria-hidden="true">Required</span> : null}
      </label>
      {children}
      {error ? (
        <p className="field__message field__message--error" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__message" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface FieldControlProps {
  label: string
  hint?: string
  error?: string
  fieldClassName?: string
}

function getDescriptionId(
  id: string,
  error: string | undefined,
  hint: string | undefined,
  describedBy: string | undefined,
) {
  return [describedBy, error ? `${id}-error` : hint ? `${id}-hint` : undefined]
    .filter(Boolean)
    .join(' ') || undefined
}

export type TextFieldProps = FieldControlProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      hint,
      error,
      fieldClassName,
      className,
      id: providedId,
      required,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId()
    const id = providedId ?? generatedId

    return (
      <Field
        label={label}
        htmlFor={id}
        hint={hint}
        error={error}
        required={required}
        className={fieldClassName}
      >
        <input
          ref={ref}
          id={id}
          className={cx('field__control', 'field__input', className)}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={getDescriptionId(id, error, hint, describedBy)}
          {...props}
        />
      </Field>
    )
  },
)

export type TextareaFieldProps = FieldControlProps &
  TextareaHTMLAttributes<HTMLTextAreaElement>

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    {
      label,
      hint,
      error,
      fieldClassName,
      className,
      id: providedId,
      required,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId()
    const id = providedId ?? generatedId

    return (
      <Field
        label={label}
        htmlFor={id}
        hint={hint}
        error={error}
        required={required}
        className={fieldClassName}
      >
        <textarea
          ref={ref}
          id={id}
          className={cx('field__control', 'field__textarea', className)}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={getDescriptionId(id, error, hint, describedBy)}
          {...props}
        />
      </Field>
    )
  },
)

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export type SelectFieldProps = FieldControlProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: readonly SelectOption[]
    placeholder?: string
  }

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    {
      label,
      hint,
      error,
      fieldClassName,
      className,
      id: providedId,
      required,
      options,
      placeholder,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId()
    const id = providedId ?? generatedId

    return (
      <Field
        label={label}
        htmlFor={id}
        hint={hint}
        error={error}
        required={required}
        className={fieldClassName}
      >
        <span className="field__select-wrap">
          <select
            ref={ref}
            id={id}
            className={cx('field__control', 'field__select', className)}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={getDescriptionId(id, error, hint, describedBy)}
            {...props}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="field__select-icon" aria-hidden="true" />
        </span>
      </Field>
    )
  },
)
