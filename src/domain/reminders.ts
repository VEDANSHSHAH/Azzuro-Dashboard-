import { fromISODate } from './dates'
import {
  REMINDER_WEEKDAYS,
  type ISODate,
  type Reminder,
  type ReminderWeekday,
} from './models'

const weekdayByCalendarDay: Record<number, ReminderWeekday> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/** Converts unknown persisted weekday data into a stable, de-duplicated list. */
export function normalizeReminderWeekdays(value: unknown): ReminderWeekday[] {
  if (!Array.isArray(value)) return []

  const selectedDays = new Set(value.filter((day): day is ReminderWeekday =>
    REMINDER_WEEKDAYS.includes(day as ReminderWeekday),
  ))

  return REMINDER_WEEKDAYS.filter((day) => selectedDays.has(day))
}

/** Returns whether a reminder is active on the supplied local calendar date. */
export function isReminderForDate(reminder: Reminder, date: ISODate): boolean {
  switch (reminder.scheduleMode) {
    case 'everyday':
      return true
    case 'weekly':
      return normalizeReminderWeekdays(reminder.weekdays).includes(
        weekdayByCalendarDay[fromISODate(date).getDay()],
      )
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
