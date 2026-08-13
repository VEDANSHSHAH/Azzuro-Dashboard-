import type { ISODate } from './models'

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
/** Converts a Date to a local (not UTC) calendar key. */
export function toISODate(date = new Date()): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false

  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(year, month - 1, day)

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
}

export function fromISODate(value: ISODate): Date {
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match || !isISODate(value)) {
    throw new Error(`Invalid local date: ${value}`)
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addDays(value: ISODate, amount: number): ISODate {
  const date = fromISODate(value)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function normalizeISODate(
  value: unknown,
  fallback: ISODate = toISODate(),
): ISODate {
  return isISODate(value) ? value : fallback
}

export function isDateBefore(left: ISODate, right: ISODate): boolean {
  return left < right
}
