import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowRight, BellRing, CalendarDays, Pencil } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '../components'
import { fromISODate, toISODate, type ISODate, type Reminder } from '../domain'
import {
  compareReminderUrgency,
  formatReminderSchedule,
  reminderAppliesOnDate,
} from './reminder-utils'

export interface ReminderBannerProps {
  reminders: readonly Reminder[]
  /** Local date to evaluate. Omit when `reminders` is already filtered for a day. */
  date?: ISODate
  heading?: string
  maxItems?: number
  onEdit?: (reminder: Reminder) => void
  onViewAll?: () => void
  className?: string
}

export function ReminderBanner({
  reminders,
  date,
  heading,
  maxItems = 3,
  onEdit,
  onViewAll,
  className,
}: ReminderBannerProps) {
  const reduceMotion = useReducedMotion()
  const activeReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => !date || reminderAppliesOnDate(reminder, date))
        .sort(compareReminderUrgency),
    [date, reminders],
  )

  if (!activeReminders.length) return null

  const visibleReminders = activeReminders.slice(0, Math.max(1, maxItems))
  const hiddenCount = activeReminders.length - visibleReminders.length
  const dateLabel = !date
    ? ''
    : date === toISODate()
      ? ' today'
      : ` on ${format(fromISODate(date), 'd MMMM')}`

  return (
    <motion.aside
      className={`reminder-banner${className ? ` ${className}` : ''}`}
      aria-labelledby="active-reminders-heading"
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
    >
      <div className="reminder-banner__header">
        <div className="reminder-banner__heading-group">
          <span className="reminder-banner__bell" aria-hidden="true">
            <BellRing />
          </span>
          <div>
            <p className="reminder-banner__eyebrow">Keep in mind{dateLabel}</p>
            <h2 className="reminder-banner__heading" id="active-reminders-heading">
              {heading ?? 'Things to remember'}
            </h2>
          </div>
        </div>
        <span className="reminder-banner__count" aria-label={`${activeReminders.length} active reminders`}>
          {activeReminders.length}
        </span>
      </div>

      <div className="reminder-banner__items">
        {visibleReminders.map((reminder) => {
          const content = (
            <>
              <span className="reminder-banner__item-copy">
                <strong className="reminder-banner__item-title">
                  {reminder.title || 'Untitled reminder'}
                </strong>
                {reminder.content ? (
                  <span className="reminder-banner__item-content">{reminder.content}</span>
                ) : null}
              </span>
              <span className="reminder-banner__item-meta">
                <CalendarDays aria-hidden="true" />
                {formatReminderSchedule(reminder)}
              </span>
              {onEdit ? <Pencil className="reminder-banner__edit-icon" aria-hidden="true" /> : null}
            </>
          )

          return onEdit ? (
            <button
              type="button"
              className="reminder-banner__item reminder-banner__item--interactive"
              key={reminder.id}
              aria-label={`Edit reminder: ${reminder.title || 'Untitled reminder'}`}
              onClick={() => onEdit(reminder)}
            >
              {content}
            </button>
          ) : (
            <div className="reminder-banner__item" key={reminder.id}>
              {content}
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 || onViewAll ? (
        <div className="reminder-banner__footer">
          {hiddenCount > 0 ? (
            <span className="reminder-banner__more">
              +{hiddenCount} more {hiddenCount === 1 ? 'reminder' : 'reminders'}
            </span>
          ) : (
            <span />
          )}
          {onViewAll ? (
            <Button
              size="sm"
              variant="quiet"
              trailingIcon={ArrowRight}
              onClick={onViewAll}
            >
              View all
            </Button>
          ) : null}
        </div>
      ) : null}
    </motion.aside>
  )
}
