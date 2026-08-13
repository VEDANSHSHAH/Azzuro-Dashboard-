import { useEffect, useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, IconButton, Modal } from '../components'
import {
  fromISODate,
  PROPERTY_OPTIONS,
  TASK_STATUS_OPTIONS,
  toISODate,
  type ISODate,
  type Property,
  type Task,
  type TaskStatus,
} from '../domain'
import { TaskCard } from './work-items'

interface CalendarModalProps {
  open: boolean
  selectedDate: ISODate
  tasks: Task[]
  onClose: () => void
  onOpenDay: (date: ISODate) => void
  onEditTask: (task: Task) => void
  onShiftTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export function CalendarModal({
  open,
  selectedDate,
  tasks,
  onClose,
  onOpenDay,
  onEditTask,
  onShiftTask,
  onDeleteTask,
  onStatusChange,
}: CalendarModalProps) {
  const [viewMonth, setViewMonth] = useState(() => fromISODate(selectedDate))
  const [focusDate, setFocusDate] = useState<ISODate>(selectedDate)
  const [property, setProperty] = useState<Property>('all')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')

  useEffect(() => {
    if (!open) return
    setViewMonth(fromISODate(selectedDate))
    setFocusDate(selectedDate)
  }, [open, selectedDate])

  const visibleDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
    })
  }, [viewMonth])

  const filteredTasks = useMemo(
    () => tasks.filter((task) =>
      (property === 'all' || task.property === property || task.property === 'all')
      && (status === 'all' || task.status === status)),
    [property, status, tasks],
  )

  const tasksByDate = useMemo(() => {
    const result = new Map<ISODate, Task[]>()
    filteredTasks.forEach((task) => {
      const existing = result.get(task.date) ?? []
      result.set(task.date, [...existing, task])
    })
    return result
  }, [filteredTasks])

  const agendaTasks = tasksByDate.get(focusDate) ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Work calendar"
      description="See every scheduled item at a glance, then open a day or move a task."
      className="dialog--calendar"
    >
      <div className="calendar-filters">
        <label className="compact-select">
          <span>Property</span>
          <select value={property} onChange={(event) => setProperty(event.target.value as Property)}>
            {PROPERTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="compact-select">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}>
            <option value="all">All statuses</option>
            {TASK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="calendar-shell">
        <div className="calendar-main">
          <div className="calendar-toolbar">
            <div className="toolbar">
              <IconButton label="Previous month" icon={ChevronLeft} variant="quiet" onClick={() => setViewMonth((month) => subMonths(month, 1))} />
              <IconButton label="Next month" icon={ChevronRight} variant="quiet" onClick={() => setViewMonth((month) => addMonths(month, 1))} />
            </div>
            <h3 className="calendar-toolbar__month">{format(viewMonth, 'MMMM yyyy')}</h3>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={CalendarDays}
              onClick={() => {
                const today = new Date()
                setViewMonth(today)
                setFocusDate(toISODate(today))
              }}
            >
              Today
            </Button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {visibleDays.map((day) => {
              const dateKey = toISODate(day)
              const dayTasks = tasksByDate.get(dateKey) ?? []
              const classNames = [
                'calendar-day',
                !isSameMonth(day, viewMonth) ? 'calendar-day--outside' : '',
                isToday(day) ? 'calendar-day--today' : '',
                dateKey === focusDate ? 'calendar-day--selected' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={classNames}
                  aria-label={`${format(day, 'EEEE, d MMMM')}, ${dayTasks.length} tasks`}
                  onClick={() => setFocusDate(dateKey)}
                  onDoubleClick={() => {
                    onOpenDay(dateKey)
                    onClose()
                  }}
                >
                  <span className="calendar-day__number">{format(day, 'd')}</span>
                  <span className="calendar-day__tasks">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span key={task.id} className={`calendar-task calendar-task--${task.status}`}>{task.title || 'Untitled'}</span>
                    ))}
                    {dayTasks.length > 3 ? <span className="calendar-more">+{dayTasks.length - 3} more</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <aside className="calendar-agenda">
          <div className="calendar-agenda__header">
            <div>
              <span className="calendar-agenda__eyebrow">Selected day</span>
              <h3 className="calendar-agenda__date">{format(fromISODate(focusDate), 'EEE, d MMMM')}</h3>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onOpenDay(focusDate)
                onClose()
              }}
            >
              Open day
            </Button>
          </div>
          <div className="task-list">
            {agendaTasks.length ? agendaTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                compact
                onEdit={() => onEditTask(task)}
                onShift={() => onShiftTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onStatusChange={(nextStatus) => onStatusChange(task.id, nextStatus)}
              />
            )) : <p className="calendar-agenda__empty">Nothing planned for this day.</p>}
          </div>
        </aside>
      </div>
    </Modal>
  )
}
