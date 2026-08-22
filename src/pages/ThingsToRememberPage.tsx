import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  BellPlus,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarCheck2,
  CalendarRange,
  Edit3,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  SelectField,
  TextareaField,
  TextField,
} from '../components'
import {
  REMINDER_WEEKDAY_OPTIONS,
  toISODate,
  type Reminder,
  type ReminderWeekday,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import {
  formatReminderSchedule,
  reminderScheduleSearchText,
} from '../features/reminder-utils'

export interface ThingsToRememberPageProps {
  workspace: WorkspaceApi
  query?: string
}

type ScheduleMode = Reminder['scheduleMode']

interface ReminderValues {
  title: string
  content: string
  scheduleMode: ScheduleMode
  specificDate: Reminder['specificDate']
  startDate: Reminder['startDate']
  endDate: Reminder['endDate']
  weekdays: Reminder['weekdays']
  intervalDays: Reminder['intervalDays']
  intervalStartDate: Reminder['intervalStartDate']
}

const scheduleOptions: ReadonlyArray<{ value: ScheduleMode; label: string }> = [
  { value: 'specific', label: 'A specific date' },
  { value: 'everyday', label: 'Every day' },
  { value: 'weekly', label: 'Every week on selected days' },
  { value: 'interval', label: 'Every 7 or 15 days' },
  { value: 'range', label: 'A date range' },
]

const intervalOptions = [
  { value: '7', label: 'Once a week — every 7 days' },
  { value: '15', label: 'Every 15 days' },
] as const

const scheduleIcons: Record<ScheduleMode, LucideIcon> = {
  specific: CalendarCheck2,
  everyday: Repeat2,
  weekly: CalendarDays,
  interval: CalendarClock,
  range: CalendarRange,
}

const scheduleModeNames: Record<ScheduleMode, string> = {
  specific: 'Specific date',
  everyday: 'Every day',
  weekly: 'Every week',
  interval: 'Repeating interval',
  range: 'Date range',
}

function scheduleSortValue(reminder: Reminder): string {
  if (reminder.scheduleMode === 'everyday') return '0000-00-00'
  if (reminder.scheduleMode === 'weekly') return '0000-00-01'
  if (reminder.scheduleMode === 'interval') return reminder.intervalStartDate ?? '9999-99-99'
  if (reminder.scheduleMode === 'specific') return reminder.specificDate ?? '9999-99-99'
  return reminder.startDate ?? '9999-99-99'
}

export function ThingsToRememberPage({
  workspace,
  query = '',
}: ThingsToRememberPageProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const reminders = useMemo(
    () =>
      workspace.data.reminders
        .filter((reminder) => {
          if (!normalizedQuery) return true
          return `${reminder.title} ${reminder.content} ${reminderScheduleSearchText(reminder)}`
            .toLocaleLowerCase()
            .includes(normalizedQuery)
        })
        .sort((left, right) => {
          const bySchedule = scheduleSortValue(left).localeCompare(scheduleSortValue(right))
          return bySchedule || right.updatedAt.localeCompare(left.updatedAt)
        }),
    [normalizedQuery, workspace.data.reminders],
  )

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(reminder: Reminder) {
    setEditing(reminder)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
  }

  return (
    <div className="page reminder-page">
      <PageHeader
        eyebrow="Your persistent memory"
        title="Things to remember"
        description={(
          <p>
            Keep the details that should stay visible on one day, every day, or
            every week on chosen days, on a 7 or 15 day cycle, or throughout a date range.
          </p>
        )}
        actions={(
          <Button leadingIcon={Plus} onClick={openNew}>
            Add reminder
          </Button>
        )}
      />

      {reminders.length ? (
        <section className="reminder-section" aria-labelledby="reminder-list-heading">
          <div className="reminder-section__header">
            <div>
              <p className="reminder-section__eyebrow">Reminder list</p>
              <h2 className="reminder-section__title" id="reminder-list-heading">
                {normalizedQuery ? 'Search results' : 'Everything worth keeping close'}
              </h2>
            </div>
            <span className="reminder-section__count">
              {reminders.length} {reminders.length === 1 ? 'reminder' : 'reminders'}
            </span>
          </div>

          <div className="reminder-grid">
            {reminders.map((reminder) => {
              const ScheduleIcon = scheduleIcons[reminder.scheduleMode]
              return (
                <article
                  className={`reminder-card reminder-card--${reminder.scheduleMode}`}
                  key={reminder.id}
                >
                  <div className="reminder-card__header">
                    <span className="reminder-card__mark" aria-hidden="true">
                      <ScheduleIcon />
                    </span>
                    <div className="reminder-card__heading">
                      <span className="reminder-card__mode">
                        {scheduleModeNames[reminder.scheduleMode]}
                      </span>
                      <h3 className="reminder-card__title">
                        {reminder.title || 'Untitled reminder'}
                      </h3>
                    </div>
                    <div className="reminder-card__actions">
                      <IconButton
                        label={`Edit ${reminder.title || 'reminder'}`}
                        icon={Edit3}
                        variant="quiet"
                        size="sm"
                        onClick={() => openEdit(reminder)}
                      />
                      <IconButton
                        label={`Delete ${reminder.title || 'reminder'}`}
                        icon={Trash2}
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const name = reminder.title || 'this reminder'
                          if (window.confirm(`Delete ${name}?`)) {
                            workspace.deleteReminder(reminder.id)
                          }
                        }}
                      />
                    </div>
                  </div>

                  <p className="reminder-card__content">
                    {reminder.content || 'No additional details.'}
                  </p>

                  <div className="reminder-card__schedule">
                    <BellRing aria-hidden="true" />
                    <span>{formatReminderSchedule(reminder)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="section-card reminder-page__empty">
          <EmptyState
            icon={BellRing}
            title={normalizedQuery ? 'No reminders match your search' : 'Nothing to remember yet'}
            description={
              normalizedQuery
                ? 'Try another word or clear your search.'
                : 'Add a detail once and let MYWORK AZZURO surface it on the days it matters.'
            }
            action={
              !normalizedQuery ? (
                <Button leadingIcon={BellPlus} onClick={openNew}>
                  Add your first reminder
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      <ReminderEditorModal
        open={editorOpen}
        reminder={editing}
        onClose={closeEditor}
        onSave={(values) => {
          if (editing) workspace.updateReminder(editing.id, values)
          else workspace.addReminder(values)
        }}
      />
    </div>
  )
}

interface ReminderEditorModalProps {
  open: boolean
  reminder: Reminder | null
  onClose: () => void
  onSave: (values: ReminderValues) => void
}

interface ReminderFormErrors {
  title?: string
  specificDate?: string
  startDate?: string
  endDate?: string
  weekdays?: string
  intervalStartDate?: string
}

function ReminderEditorModal({
  open,
  reminder,
  onClose,
  onSave,
}: ReminderEditorModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('specific')
  const [specificDate, setSpecificDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [weekdays, setWeekdays] = useState<ReminderWeekday[]>([])
  const [intervalDays, setIntervalDays] = useState('7')
  const [intervalStartDate, setIntervalStartDate] = useState('')
  const [errors, setErrors] = useState<ReminderFormErrors>({})

  useEffect(() => {
    if (!open) return
    setTitle(reminder?.title ?? '')
    setContent(reminder?.content ?? '')
    setScheduleMode(reminder?.scheduleMode ?? 'specific')
    setSpecificDate(reminder?.specificDate ?? '')
    setStartDate(reminder?.startDate ?? '')
    setEndDate(reminder?.endDate ?? '')
    setWeekdays(reminder?.weekdays ?? [])
    setIntervalDays(String(reminder?.intervalDays === 15 ? 15 : 7))
    setIntervalStartDate(reminder?.intervalStartDate ?? toISODate())
    setErrors({})
  }, [open, reminder])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: ReminderFormErrors = {}

    if (!title.trim()) nextErrors.title = 'Give this reminder a short name.'
    if (scheduleMode === 'specific' && !specificDate) {
      nextErrors.specificDate = 'Choose the date this should appear.'
    }
    if (scheduleMode === 'range') {
      if (!startDate) nextErrors.startDate = 'Choose a start date.'
      if (!endDate) nextErrors.endDate = 'Choose an end date.'
      if (startDate && endDate && startDate > endDate) {
        nextErrors.endDate = 'The end date must be on or after the start date.'
      }
    }
    if (scheduleMode === 'weekly' && weekdays.length === 0) {
      nextErrors.weekdays = 'Choose at least one day of the week.'
    }
    if (scheduleMode === 'interval' && !intervalStartDate) {
      nextErrors.intervalStartDate = 'Choose the first date in this cycle.'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    onSave({
      title: title.trim(),
      content: content.trim(),
      scheduleMode,
      specificDate: (scheduleMode === 'specific' ? specificDate : null) as Reminder['specificDate'],
      startDate: (scheduleMode === 'range' ? startDate : null) as Reminder['startDate'],
      endDate: (scheduleMode === 'range' ? endDate : null) as Reminder['endDate'],
      weekdays: scheduleMode === 'weekly' ? weekdays : [],
      intervalDays: scheduleMode === 'interval' ? Number(intervalDays) : null,
      intervalStartDate: (scheduleMode === 'interval' ? intervalStartDate : null) as Reminder['intervalStartDate'],
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? 'Edit reminder' : 'Add a reminder'}
      description="Choose when this should stay visible in your daily workspace."
      className="reminder-dialog"
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="reminder-form" leadingIcon={BellPlus}>
            Save reminder
          </Button>
        </>
      )}
    >
      <form id="reminder-form" className="form-grid reminder-form" noValidate onSubmit={submit}>
        <TextField
          label="Reminder name"
          value={title}
          required
          autoFocus
          placeholder="e.g. Check the arrivals report"
          error={errors.title}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            setTitle(event.target.value)
            if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
          }}
        />
        <TextareaField
          label="Details"
          value={content}
          rows={5}
          placeholder="Add the context you do not want to lose…"
          hint="Keep it short enough to scan while you work."
          fieldClassName="form-grid__full"
          onChange={(event) => setContent(event.target.value)}
        />
        <SelectField
          label="Show this reminder"
          value={scheduleMode}
          options={scheduleOptions}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            setScheduleMode(event.target.value as ScheduleMode)
            setErrors({})
          }}
        />

        {scheduleMode === 'everyday' ? (
          <div className="reminder-form__schedule-note form-grid__full">
            <Repeat2 aria-hidden="true" />
            <div>
              <strong>Visible every day</strong>
              <span>This reminder will stay at the top of Today and each Day-wise view.</span>
            </div>
          </div>
        ) : null}

        {scheduleMode === 'weekly' ? (
          <fieldset className="reminder-weekdays form-grid__full">
            <legend className="reminder-weekdays__legend">Repeat every week</legend>
            <div className="reminder-weekdays__heading">
              <div>
                <p>Choose the days this reminder should appear and trigger when you open the app.</p>
              </div>
              <CalendarDays aria-hidden="true" />
            </div>
            <div className="reminder-weekdays__choices">
              {REMINDER_WEEKDAY_OPTIONS.map((option) => {
                const isSelected = weekdays.includes(option.value)
                return (
                  <label className="reminder-weekdays__choice" key={option.value}>
                    <input
                      type="checkbox"
                      aria-label={option.label}
                      checked={isSelected}
                      onChange={() => {
                        setWeekdays((current) => {
                          const selected = new Set(current)
                          if (selected.has(option.value)) selected.delete(option.value)
                          else selected.add(option.value)
                          return REMINDER_WEEKDAY_OPTIONS
                            .map((day) => day.value)
                            .filter((day) => selected.has(day))
                        })
                        if (errors.weekdays) {
                          setErrors((current) => ({ ...current, weekdays: undefined }))
                        }
                      }}
                    />
                    <span title={option.label}>{option.shortLabel}</span>
                  </label>
                )
              })}
            </div>
            {errors.weekdays ? <p className="reminder-weekdays__error" role="alert">{errors.weekdays}</p> : null}
          </fieldset>
        ) : null}

        {scheduleMode === 'interval' ? (
          <>
            <div className="reminder-form__schedule-note form-grid__full">
              <CalendarClock aria-hidden="true" />
              <div>
                <strong>Repeating interval</strong>
                <span>Choose the first reminder date; it will appear again every 7 or 15 days.</span>
              </div>
            </div>
            <SelectField
              label="Repeat interval"
              value={intervalDays}
              options={intervalOptions}
              onChange={(event) => setIntervalDays(event.target.value)}
            />
            <TextField
              label="First reminder date"
              type="date"
              value={intervalStartDate}
              required
              error={errors.intervalStartDate}
              onChange={(event) => {
                setIntervalStartDate(event.target.value)
                if (errors.intervalStartDate) {
                  setErrors((current) => ({ ...current, intervalStartDate: undefined }))
                }
              }}
            />
          </>
        ) : null}

        {scheduleMode === 'specific' ? (
          <TextField
            label="Reminder date"
            type="date"
            value={specificDate}
            required
            error={errors.specificDate}
            fieldClassName="form-grid__full"
            onChange={(event) => {
              setSpecificDate(event.target.value)
              if (errors.specificDate) {
                setErrors((current) => ({ ...current, specificDate: undefined }))
              }
            }}
          />
        ) : null}

        {scheduleMode === 'range' ? (
          <>
            <TextField
              label="Start date"
              type="date"
              value={startDate}
              required
              error={errors.startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                if (errors.startDate || errors.endDate) {
                  setErrors((current) => ({
                    ...current,
                    startDate: undefined,
                    endDate: undefined,
                  }))
                }
              }}
            />
            <TextField
              label="End date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              required
              error={errors.endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                if (errors.endDate) {
                  setErrors((current) => ({ ...current, endDate: undefined }))
                }
              }}
            />
          </>
        ) : null}
      </form>
    </Modal>
  )
}
