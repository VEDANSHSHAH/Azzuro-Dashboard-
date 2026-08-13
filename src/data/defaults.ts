import { isISODate, toISODate } from '../domain/dates'
import {
  normalizeCallPoints,
  normalizeTaskKind,
  normalizeTaskStatusForKind,
  repairCallPointTaskReferences,
} from '../domain/calls'
import { repairTaskParentLinks } from '../domain/taskChains'
import {
  CLEANING_STATUSES,
  PROPERTIES,
  REMINDER_SCHEDULE_MODES,
  TASK_STATUSES,
  type AppData,
  type CleaningEntry,
  type CleaningStatus,
  type LinkEntry,
  type Note,
  type Property,
  type Reminder,
  type ReminderScheduleMode,
  type RuleNote,
  type Task,
  type TaskStatus,
} from '../domain/models'

type UnknownRecord = Record<string, unknown>

function now(): string {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function timestamp(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return Number.isNaN(Date.parse(value)) ? fallback : value
}

function date(value: unknown, fallback: string): string {
  return isISODate(value) ? value : fallback
}

function nullableDate(value: unknown): string | null {
  return isISODate(value) ? value : null
}

function property(value: unknown): Property {
  return PROPERTIES.includes(value as Property) ? (value as Property) : 'all'
}

function taskStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
    ? (value as TaskStatus)
    : 'untouched'
}

function cleaningStatus(value: unknown): CleaningStatus {
  return CLEANING_STATUSES.includes(value as CleaningStatus)
    ? (value as CleaningStatus)
    : 'scheduled'
}

function reminderScheduleMode(value: unknown): ReminderScheduleMode {
  return REMINDER_SCHEDULE_MODES.includes(value as ReminderScheduleMode)
    ? (value as ReminderScheduleMode)
    : 'specific'
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyAppData(): AppData {
  return {
    version: 1,
    notes: [],
    tasks: [],
    reminders: [],
    cleaningEntries: [],
    ruleNotes: [],
    links: [],
    updatedAt: now(),
  }
}

function normalizeNote(value: unknown, fallbackTimestamp: string): Note | null {
  if (!isRecord(value)) return null

  return {
    id: text(value.id) || createId('note'),
    date: date(value.date, toISODate()),
    title: text(value.title),
    content: text(value.content),
    pinned: value.pinned === true,
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}

function normalizeTask(value: unknown, fallbackTimestamp: string): Task | null {
  if (!isRecord(value)) return null

  const kind = normalizeTaskKind(value.kind)
  const status = normalizeTaskStatusForKind(kind, taskStatus(value.status))
  const id = text(value.id) || createId('task')
  return {
    id,
    kind,
    date: date(value.date, toISODate()),
    title: text(value.title),
    description: text(value.description),
    findings: text(value.findings),
    callOutcome: text(value.callOutcome),
    callPoints: normalizeCallPoints(value.callPoints, id),
    property: property(value.property),
    status,
    assignedTo: text(value.assignedTo),
    parentTaskId: text(value.parentTaskId) || null,
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
    completedAt:
      status === 'done' && typeof value.completedAt === 'string'
        ? timestamp(value.completedAt, fallbackTimestamp)
        : null,
  }
}

function normalizeReminder(
  value: unknown,
  fallbackTimestamp: string,
): Reminder | null {
  if (!isRecord(value)) return null

  return {
    id: text(value.id) || createId('reminder'),
    title: text(value.title),
    content: text(value.content, text(value.details)),
    scheduleMode: reminderScheduleMode(value.scheduleMode),
    specificDate: nullableDate(value.specificDate),
    startDate: nullableDate(value.startDate),
    endDate: nullableDate(value.endDate),
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}

function normalizeCleaningEntry(
  value: unknown,
  fallbackTimestamp: string,
): CleaningEntry | null {
  if (!isRecord(value)) return null

  return {
    id: text(value.id) || createId('cleaning'),
    title: text(value.title),
    property: property(value.property),
    lastCleanedDate: nullableDate(value.lastCleanedDate),
    nextCleaningDate: nullableDate(value.nextCleaningDate),
    notes: text(value.notes),
    status: cleaningStatus(value.status),
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}

function normalizeRuleNote(value: unknown, fallbackTimestamp: string): RuleNote | null {
  if (!isRecord(value)) return null

  return {
    id: text(value.id) || createId('rule'),
    title: text(value.title),
    content: text(value.content),
    category: text(value.category),
    pinned: value.pinned === true,
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}

function normalizeLink(value: unknown, fallbackTimestamp: string): LinkEntry | null {
  if (!isRecord(value)) return null

  return {
    id: text(value.id) || createId('link'),
    name: text(value.name),
    url: text(value.url),
    username: text(value.username),
    password: text(value.password),
    notes: text(value.notes),
    property: property(value.property),
    createdAt: timestamp(value.createdAt, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}

function normalizeList<T>(
  value: unknown,
  normalize: (item: unknown, fallbackTimestamp: string) => T | null,
  fallbackTimestamp: string,
): T[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalize(item, fallbackTimestamp))
    .filter((item): item is T => item !== null)
}

/**
 * Accepts persisted unknown data and returns the current schema. Bad individual
 * records are ignored so one corrupt entry does not make the workspace unusable.
 */
export function normalizeAppData(value: unknown): AppData {
  if (!isRecord(value)) return createEmptyAppData()

  const fallbackTimestamp = now()
  const tasks = normalizeList(value.tasks, normalizeTask, fallbackTimestamp)
  const repairedTasks = repairCallPointTaskReferences(repairTaskParentLinks(tasks))

  return {
    version: 1,
    notes: normalizeList(value.notes, normalizeNote, fallbackTimestamp),
    tasks: repairedTasks,
    reminders: normalizeList(value.reminders, normalizeReminder, fallbackTimestamp),
    cleaningEntries: normalizeList(
      value.cleaningEntries,
      normalizeCleaningEntry,
      fallbackTimestamp,
    ),
    ruleNotes: normalizeList(value.ruleNotes, normalizeRuleNote, fallbackTimestamp),
    links: normalizeList(value.links, normalizeLink, fallbackTimestamp),
    updatedAt: timestamp(value.updatedAt, fallbackTimestamp),
  }
}
