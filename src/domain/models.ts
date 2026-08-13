export const PROPERTIES = [
  'all',
  'pyrmont',
  'allen',
  'potts-point',
  'olympic',
  'central',
] as const

export type Property = (typeof PROPERTIES)[number]

export const PROPERTY_OPTIONS: ReadonlyArray<{
  value: Property
  label: string
}> = [
  { value: 'all', label: 'All properties' },
  { value: 'pyrmont', label: 'Pyrmont' },
  { value: 'allen', label: 'Allen' },
  { value: 'potts-point', label: 'Potts Point' },
  { value: 'olympic', label: 'Olympic' },
  { value: 'central', label: 'Central' },
]

export const TASK_STATUSES = ['untouched', 'scheduled', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_OPTIONS: ReadonlyArray<{
  value: TaskStatus
  label: string
}> = [
  { value: 'untouched', label: 'Untouched' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
]

export const TASK_ASSIGNMENT_STATES = ['needs-giving', 'given'] as const
export type TaskAssignmentState = (typeof TASK_ASSIGNMENT_STATES)[number]

export const CLEANING_STATUSES = ['scheduled', 'completed', 'overdue'] as const
export type CleaningStatus = (typeof CLEANING_STATUSES)[number]

export const CLEANING_STATUS_OPTIONS: ReadonlyArray<{
  value: CleaningStatus
  label: string
}> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
]

export const REMINDER_SCHEDULE_MODES = ['specific', 'everyday', 'range'] as const
export type ReminderScheduleMode = (typeof REMINDER_SCHEDULE_MODES)[number]

export const REMINDER_SCHEDULE_MODE_OPTIONS: ReadonlyArray<{
  value: ReminderScheduleMode
  label: string
}> = [
  { value: 'specific', label: 'Specific date' },
  { value: 'everyday', label: 'Every day' },
  { value: 'range', label: 'Date range' },
]

/** A local calendar date in YYYY-MM-DD format. */
export type ISODate = string

/** An ISO-8601 timestamp, normally produced by Date#toISOString. */
export type ISODateTime = string

export type TaskKind = 'task' | 'call'

export interface CallPoint {
  id: string
  text: string
  convertedTaskId: string | null
}

export interface Note {
  id: string
  date: ISODate
  title: string
  content: string
  pinned: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Task {
  id: string
  kind: TaskKind
  /** The Day-wise date where this task was first added. */
  date: ISODate
  /** An optional second Day-wise date where the task should also appear. */
  scheduledFor: ISODate | null
  title: string
  description: string
  findings: string
  callOutcome: string
  callPoints: CallPoint[]
  property: Property
  status: TaskStatus
  assignedTo: string
  assignmentState: TaskAssignmentState | null
  parentTaskId: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  completedAt: ISODateTime | null
}

export interface Reminder {
  id: string
  title: string
  content: string
  scheduleMode: ReminderScheduleMode
  specificDate: ISODate | null
  startDate: ISODate | null
  endDate: ISODate | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CleaningEntry {
  id: string
  title: string
  property: Property
  lastCleanedDate: ISODate | null
  nextCleaningDate: ISODate | null
  notes: string
  status: CleaningStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface RuleNote {
  id: string
  title: string
  content: string
  category: string
  pinned: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface LinkEntry {
  id: string
  name: string
  url: string
  username: string
  password: string
  notes: string
  property: Property
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface AppData {
  version: 1
  notes: Note[]
  tasks: Task[]
  reminders: Reminder[]
  cleaningEntries: CleaningEntry[]
  ruleNotes: RuleNote[]
  links: LinkEntry[]
  updatedAt: ISODateTime
}

export interface CreateNoteInput {
  date?: ISODate
  title?: string
  content?: string
  pinned?: boolean
}

export type UpdateNoteInput = Partial<
  Pick<Note, 'date' | 'title' | 'content' | 'pinned'>
>

export interface CreateTaskInput {
  kind?: TaskKind
  date?: ISODate
  scheduledFor?: ISODate | null
  title?: string
  description?: string
  findings?: string
  callOutcome?: string
  callPoints?: CallPoint[]
  property?: Property
  status?: TaskStatus
  assignedTo?: string
  assignmentState?: TaskAssignmentState | null
  parentTaskId?: string | null
}

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | 'kind'
    | 'date'
    | 'scheduledFor'
    | 'title'
    | 'description'
    | 'findings'
    | 'callOutcome'
    | 'callPoints'
    | 'property'
    | 'status'
    | 'assignedTo'
    | 'assignmentState'
    | 'parentTaskId'
  >
>

export interface CreateReminderInput {
  title?: string
  content?: string
  scheduleMode?: ReminderScheduleMode
  specificDate?: ISODate | null
  startDate?: ISODate | null
  endDate?: ISODate | null
}

export type UpdateReminderInput = Partial<
  Pick<
    Reminder,
    | 'title'
    | 'content'
    | 'scheduleMode'
    | 'specificDate'
    | 'startDate'
    | 'endDate'
  >
>

export interface CreateCleaningEntryInput {
  title?: string
  property?: Property
  lastCleanedDate?: ISODate | null
  nextCleaningDate?: ISODate | null
  notes?: string
  status?: CleaningStatus
}

export type UpdateCleaningEntryInput = Partial<
  Pick<
    CleaningEntry,
    | 'title'
    | 'property'
    | 'lastCleanedDate'
    | 'nextCleaningDate'
    | 'notes'
    | 'status'
  >
>

export interface CreateRuleNoteInput {
  title?: string
  content?: string
  category?: string
  pinned?: boolean
}

export type UpdateRuleNoteInput = Partial<
  Pick<RuleNote, 'title' | 'content' | 'category' | 'pinned'>
>

export interface CreateLinkInput {
  name?: string
  url?: string
  username?: string
  password?: string
  notes?: string
  property?: Property
}

export type UpdateLinkInput = Partial<
  Pick<LinkEntry, 'name' | 'url' | 'username' | 'password' | 'notes' | 'property'>
>
