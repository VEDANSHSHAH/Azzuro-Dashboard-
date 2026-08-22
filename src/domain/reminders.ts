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

/** Accepts safe day intervals while discarding malformed persisted values. */
export function normalizeReminderIntervalDays(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365
    ? value
    : null
}

function calendarDayNumber(date: ISODate): number {
  const localDate = fromISODate(date)
  return Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
  ) / 86_400_000
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
    case 'interval': {
      const intervalDays = normalizeReminderIntervalDays(reminder.intervalDays)
      if (!intervalDays || !reminder.intervalStartDate) return false

      const elapsedDays = calendarDayNumber(date) - calendarDayNumber(reminder.intervalStartDate)
      return elapsedDays >= 0 && elapsedDays % intervalDays === 0
    }
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
