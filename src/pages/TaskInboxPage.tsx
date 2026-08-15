import { useMemo, useState } from 'react'
import { CalendarDays, ListTodo, Plus } from 'lucide-react'
import { Button, EmptyState, PageHeader } from '../components'
import type {
  CallPoint,
  Task,
  TaskAssignmentState,
  TaskStatus,
} from '../domain'
import { TaskCard } from '../features/work-items'

interface TaskInboxPageProps {
  tasks: Task[]
  query: string
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onAssignmentStateChange: (id: string, state: TaskAssignmentState) => void
}

function matchesQuery(task: Task, query: string): boolean {
  const search = query.trim().toLocaleLowerCase()
  if (!search) return true
  return `${task.title} ${task.description} ${task.statusNote} ${task.findings} ${task.assignedTo}`
    .toLocaleLowerCase()
    .includes(search)
}

export function TaskInboxPage({
  tasks,
  query,
  onAddTask,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onDeleteTask,
  onStatusChange,
  onAssignmentStateChange,
}: TaskInboxPageProps) {
  const [showUnfinished, setShowUnfinished] = useState(false)
  const inboxTasks = useMemo(
    () => tasks.filter((task) => task.date === null && matchesQuery(task, query)),
    [query, tasks],
  )
  const unfinishedTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && matchesQuery(task, query)),
    [query, tasks],
  )
  const displayedTasks = showUnfinished ? unfinishedTasks : inboxTasks
  const unfinishedCount = tasks.filter((task) => task.status !== 'done').length

  return (
    <div className="page">
      <PageHeader
        eyebrow="Task inbox"
        title="Unscheduled tasks"
        description={
          <p>
            Capture work before it has a day. It stays here until you schedule it,
            while the unfinished view keeps every active task in reach.
          </p>
        }
        actions={
          <>
            <Button
              variant={showUnfinished ? 'primary' : 'secondary'}
              leadingIcon={ListTodo}
              aria-pressed={showUnfinished}
              onClick={() => setShowUnfinished((current) => !current)}
            >
              All unfinished ({unfinishedCount})
            </Button>
            <Button leadingIcon={Plus} onClick={onAddTask}>Add task</Button>
          </>
        }
      />

      <section className="section-card task-inbox">
        <div className="section-card__header">
          <div className="section-card__heading">
            {showUnfinished ? <ListTodo aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
            <h2 className="section-card__title">
              {showUnfinished ? 'All unfinished work' : 'No day assigned'}
            </h2>
            <span className="section-card__count">{displayedTasks.length}</span>
          </div>
          <span className="task-inbox__hint">
            {showUnfinished
              ? 'Includes unfinished work from every day'
              : 'Schedule a task any time from its calendar button'}
          </span>
        </div>
        <div className="section-card__body">
          {displayedTasks.length ? (
            <div className="task-list">
              {displayedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showDate={showUnfinished}
                  allTasks={tasks}
                  parentTask={task.parentTaskId ? tasks.find((candidate) => candidate.id === task.parentTaskId) ?? null : null}
                  followUpTasks={tasks.filter((candidate) => candidate.parentTaskId === task.id)}
                  onEdit={() => onEditTask(task)}
                  onCreateFollowUp={() => onCreateFollowUp(task)}
                  onConvertCallPoint={(point) => onConvertCallPoint(task, point)}
                  onOpenLinkedTask={onEditTask}
                  onShift={() => onShiftTask(task)}
                  onDelete={() => onDeleteTask(task.id)}
                  onStatusChange={(status) => onStatusChange(task.id, status)}
                  onAssignmentStateChange={(state) => onAssignmentStateChange(task.id, state)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={showUnfinished ? ListTodo : CalendarDays}
              title={
                query
                  ? 'No matching tasks'
                  : showUnfinished
                    ? 'Nothing unfinished'
                    : 'Your task inbox is clear'
              }
              description={
                query
                  ? 'Try another search phrase.'
                  : showUnfinished
                    ? 'Every task is marked done.'
                    : 'Add a task here when you do not want to give it a day yet.'
              }
              action={
                !query && !showUnfinished
                  ? <Button size="sm" leadingIcon={Plus} onClick={onAddTask}>Add task</Button>
                  : undefined
              }
            />
          )}
        </div>
      </section>
    </div>
  )
}
