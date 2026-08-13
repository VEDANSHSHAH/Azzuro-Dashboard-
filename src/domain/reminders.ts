import type { ISODate, Reminder } from './models'

/** Returns whether a reminder is active on the supplied local calendar date. */
export function isReminderForDate(reminder: Reminder, date: ISODate): boolean {
  switch (reminder.scheduleMode) {
    case 'everyday':
      return true
    case 'specific':
      return reminder.specificDate === date
    case 'range':
      return (
        reminder.startDate !== null &&
        reminder.endDate !== null &&
        reminder.startDate <= date &&
        date <= reminder.endDate
      )
  }
}
