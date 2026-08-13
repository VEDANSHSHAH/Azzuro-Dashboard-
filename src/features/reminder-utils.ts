import { format } from 'date-fns'
import {
  fromISODate,
  isReminderForDate,
  type ISODate,
  type Reminder,
} from '../domain'

function formatDate(value: ISODate): string {
  return format(fromISODate(value), 'd MMM yyyy')
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
  everyday: 2,
}

/** One-off reminders are shown before ranges and recurring reminders. */
export function compareReminderUrgency(left: Reminder, right: Reminder): number {
  const priority = bannerPriority[left.scheduleMode] - bannerPriority[right.scheduleMode]
  if (priority !== 0) return priority
  return right.updatedAt.localeCompare(left.updatedAt)
}
