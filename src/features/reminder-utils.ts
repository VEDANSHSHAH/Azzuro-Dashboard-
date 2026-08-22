import { format } from 'date-fns'
import {
  fromISODate,
  isReminderForDate,
  REMINDER_WEEKDAY_OPTIONS,
  type ISODate,
  type Reminder,
} from '../domain'

function formatDate(value: ISODate): string {
  return format(fromISODate(value), 'd MMM yyyy')
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

/** Returns whether a reminder should be visible on a local calendar date. */
export function reminderAppliesOnDate(
  reminder: Reminder,
  date: ISODate,
): boolean {
  return isReminderForDate(reminder, date)
}

export function formatReminderSchedule(reminder: Reminder): string {
  switch (reminder.scheduleMode) {
    case 'everyday':
      return 'Every day'
    case 'weekly': {
      const labels = REMINDER_WEEKDAY_OPTIONS
        .filter((option) => reminder.weekdays.includes(option.value))
        .map((option) => option.label)
      return labels.length ? `Every ${joinLabels(labels)}` : 'Weekly schedule not set'
    }
    case 'specific':
      return reminder.specificDate
        ? formatDate(reminder.specificDate)
        : 'Date not set'
    case 'range':
      if (reminder.startDate && reminder.endDate) {
        return `${formatDate(reminder.startDate)} – ${formatDate(reminder.endDate)}`
      }
      return 'Date range not set'
  }
}

export function reminderScheduleSearchText(reminder: Reminder): string {
  return `${reminder.scheduleMode} ${formatReminderSchedule(reminder)}`
}

const bannerPriority: Record<Reminder['scheduleMode'], number> = {
  specific: 0,
  range: 1,
  weekly: 2,
  everyday: 3,
}

/** One-off reminders are shown before ranges and recurring reminders. */
export function compareReminderUrgency(left: Reminder, right: Reminder): number {
  const priority = bannerPriority[left.scheduleMode] - bannerPriority[right.scheduleMode]
  if (priority !== 0) return priority
  return right.updatedAt.localeCompare(left.updatedAt)
}
