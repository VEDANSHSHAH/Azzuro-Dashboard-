import { Check, Circle, Clock3, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cx } from './utils'

export type TaskStatus = 'untouched' | 'scheduled' | 'done'

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: LucideIcon }
> = {
  untouched: { label: 'Untouched', icon: Circle },
  scheduled: { label: 'Scheduled', icon: Clock3 },
  done: { label: 'Done', icon: Check },
}

export interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({
  status,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cx(
        'badge',
        'status-badge',
        `status-badge--${status}`,
        `badge--${size}`,
        className,
      )}
    >
      <Icon className="badge__icon" aria-hidden="true" />
      {config.label}
    </span>
  )
}

export interface PropertyBadgeProps {
  property: string
  size?: 'sm' | 'md'
  className?: string
}

function propertyClassName(property: string) {
  return property
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function PropertyBadge({
  property,
  size = 'md',
  className,
}: PropertyBadgeProps) {
  return (
    <span
      className={cx(
        'badge',
        'property-badge',
        `property-badge--${propertyClassName(property)}`,
        `badge--${size}`,
        className,
      )}
    >
      <MapPin className="badge__icon" aria-hidden="true" />
      {property}
    </span>
  )
}
