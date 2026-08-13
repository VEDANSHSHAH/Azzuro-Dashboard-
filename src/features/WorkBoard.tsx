import { AnimatePresence } from 'motion/react'
import { CheckCircle2, CircleDot, Clock3, FileText, ListChecks, Plus } from 'lucide-react'
import { Button, EmptyState } from '../components'
import {
  PROPERTY_OPTIONS,
  type CallPoint,
  type Note,
  type Property,
  type Task,
  type TaskStatus,
} from '../domain'
import { NoteCard, TaskCard } from './work-items'

interface WorkBoardProps {
  notes: Note[]
  tasks: Task[]
  allTasks: Task[]
  query: string
  propertyFilter: Property
  onPropertyFilterChange: (property: Property) => void
  onAdd: () => void
  onUpdateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'pinned'>>) => void
  onDeleteNote: (id: string) => void
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  showTaskDates?: boolean
}

export function WorkBoard({
  notes,
  tasks,
  allTasks,
  query,
  propertyFilter,
  onPropertyFilterChange,
  onAdd,
  onUpdateNote,
  onDeleteNote,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onDeleteTask,
  onStatusChange,
  showTaskDates = false,
}: WorkBoardProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleNotes = notes
    .filter((note) => !normalizedQuery || `${note.title} ${note.content}`.toLocaleLowerCase().includes(normalizedQuery))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned))
  const visibleTasks = tasks.filter((task) => {
    const propertyMatches = propertyFilter === 'all' || task.property === propertyFilter || task.property === 'all'
    const queryMatches =
      !normalizedQuery ||
      `${task.title} ${task.description} ${task.findings} ${task.callOutcome} ${task.callPoints.map((point) => point.text).join(' ')} ${task.assignedTo}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    return propertyMatches && queryMatches
  })

  const untouched = tasks.filter((task) => task.status === 'untouched').length
  const scheduled = tasks.filter((task) => task.status === 'scheduled').length
  const done = tasks.filter((task) => task.status === 'done').length

  return (
    <>
      <div className="summary-strip">
        <div className="summary-card">
          <span className="summary-card__icon"><CircleDot aria-hidden="true" /></span>
          <div><strong className="summary-card__value">{untouched}</strong><span className="summary-card__label">Untouched</span></div>
        </div>
        <div className="summary-card">
          <span className="summary-card__icon summary-card__icon--scheduled"><Clock3 aria-hidden="true" /></span>
          <div><strong className="summary-card__value">{scheduled}</strong><span className="summary-card__label">Scheduled</span></div>
        </div>
        <div className="summary-card">
          <span className="summary-card__icon summary-card__icon--done"><CheckCircle2 aria-hidden="true" /></span>
          <div><strong className="summary-card__value">{done}</strong><span className="summary-card__label">Done</span></div>
        </div>
      </div>

      <div className="filter-rail" role="group" aria-label="Filter tasks by property">
        {PROPERTY_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`filter-chip${propertyFilter === option.value ? ' filter-chip--active' : ''}`}
            onClick={() => onPropertyFilterChange(option.value)}
          >
            {propertyFilter === option.value ? <span className="filter-chip__dot" /> : null}
            {option.value === 'all' ? 'All properties' : option.label}
          </button>
        ))}
      </div>

      <div className="day-grid">
        <section className="section-card day-grid__main">
          <div className="section-card__header">
            <div className="section-card__heading">
              <ListChecks aria-hidden="true" />
              <h2 className="section-card__title">Tasks &amp; calls</h2>
              <span className="section-card__count">{visibleTasks.length}</span>
            </div>
          </div>
          <div className="section-card__body">
            {visibleTasks.length ? (
              <div className="task-list">
                <AnimatePresence initial={false}>
                  {visibleTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showDate={showTaskDates}
                      parentTask={task.parentTaskId ? allTasks.find((candidate) => candidate.id === task.parentTaskId) ?? null : null}
                      followUpTasks={allTasks.filter((candidate) => candidate.parentTaskId === task.id)}
                      allTasks={allTasks}
                      onEdit={() => onEditTask(task)}
                      onCreateFollowUp={() => onCreateFollowUp(task)}
                      onConvertCallPoint={(point) => onConvertCallPoint(task, point)}
                      onOpenLinkedTask={onEditTask}
                      onShift={() => onShiftTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onStatusChange={(status) => onStatusChange(task.id, status)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                icon={ListChecks}
                title={query || propertyFilter !== 'all' ? 'No matching tasks' : 'A clear runway'}
                description={query || propertyFilter !== 'all' ? 'Try another search or property filter.' : 'Add the first task or call for this day when something comes up.'}
                action={!query && propertyFilter === 'all' ? <Button size="sm" leadingIcon={Plus} onClick={onAdd}>Add work</Button> : undefined}
              />
            )}
          </div>
        </section>

        <section className="section-card day-grid__side">
          <div className="section-card__header">
            <div className="section-card__heading">
              <FileText aria-hidden="true" />
              <h2 className="section-card__title">Notes</h2>
              <span className="section-card__count">{visibleNotes.length}</span>
            </div>
          </div>
          <div className="section-card__body">
            {visibleNotes.length ? (
              <div className="note-list">
                <AnimatePresence initial={false}>
                  {visibleNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      compact
                      onChange={(patch) => onUpdateNote(note.id, patch)}
                      onDelete={() => onDeleteNote(note.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={query ? 'No matching notes' : 'No notes yet'}
                description={query ? 'Try a different search phrase.' : 'Capture handovers, calls, and important context here.'}
                action={!query ? <Button size="sm" leadingIcon={Plus} onClick={onAdd}>Add work</Button> : undefined}
              />
            )}
          </div>
        </section>
      </div>
    </>
  )
}
