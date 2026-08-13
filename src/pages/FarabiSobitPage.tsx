import { format } from 'date-fns'
import { CalendarDays, UsersRound } from 'lucide-react'
import { EmptyState, PageHeader } from '../components'
import {
  getTaskDates,
  fromISODate,
  type CallPoint,
  type ISODate,
  type Task,
  type TaskAssignmentState,
  type TaskStatus,
} from '../domain'
import { TaskCard } from '../features/work-items'

const TEAM_MEMBERS = ['Farabi', 'Sobit'] as const
type TeamMember = (typeof TEAM_MEMBERS)[number]

interface FarabiSobitPageProps {
  tasks: Task[]
  query: string
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onAssignmentStateChange: (id: string, state: TaskAssignmentState) => void
}

function isAssignedTo(task: Task, member: TeamMember): boolean {
  return task.assignedTo.toLocaleLowerCase().includes(member.toLocaleLowerCase())
}

function matchesQuery(task: Task, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true

  return `${task.title} ${task.description} ${task.statusNote} ${task.findings} ${task.callOutcome} ${task.callPoints.map((point) => point.text).join(' ')} ${task.assignedTo}`
    .toLocaleLowerCase()
    .includes(normalizedQuery)
}

function groupTasksByDate(tasks: readonly Task[]): Array<[ISODate, Task[]]> {
  const tasksByDate = new Map<ISODate, Task[]>()

  tasks.forEach((task) => {
    getTaskDates(task).forEach((date) => {
      const existing = tasksByDate.get(date) ?? []
      tasksByDate.set(date, [...existing, task])
    })
  })

  return [...tasksByDate.entries()].sort(([left], [right]) => right.localeCompare(left))
}

interface PersonColumnProps {
  member: TeamMember
  tasks: Task[]
  allTasks: Task[]
  query: string
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onAssignmentStateChange: (id: string, state: TaskAssignmentState) => void
}

function PersonColumn({
  member,
  tasks,
  allTasks,
  query,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onDeleteTask,
  onStatusChange,
  onAssignmentStateChange,
}: PersonColumnProps) {
  const assignedTasks = tasks.filter((task) => isAssignedTo(task, member) && matchesQuery(task, query))
  const groups = groupTasksByDate(assignedTasks)

  return (
    <section className="section-card assignee-column">
      <div className="section-card__header">
        <div className="section-card__heading">
          <UsersRound aria-hidden="true" />
          <h2 className="section-card__title">{member}</h2>
          <span className="section-card__count">{assignedTasks.length}</span>
        </div>
        <span className="assignee-column__label">Assigned work</span>
      </div>
      <div className="section-card__body">
        {groups.length ? (
          <div className="assignee-date-groups">
            {groups.map(([date, dateTasks]) => (
              <section className="assignee-date-group" key={date}>
                <div className="assignee-date-group__heading">
                  <CalendarDays aria-hidden="true" />
                  <h3>{format(fromISODate(date), 'EEEE, d MMMM yyyy')}</h3>
                  <span>{dateTasks.length}</span>
                </div>
                <div className="task-list">
                  {dateTasks.map((task) => (
                    <TaskCard
                      key={`${date}-${task.id}`}
                      task={task}
                      allTasks={allTasks}
                      parentTask={task.parentTaskId ? allTasks.find((candidate) => candidate.id === task.parentTaskId) ?? null : null}
                      followUpTasks={allTasks.filter((candidate) => candidate.parentTaskId === task.id)}
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
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UsersRound}
            title={query ? `No matching work for ${member}` : `Nothing assigned to ${member}`}
            description={
              query
                ? 'Try another search phrase.'
                : `Assign a task or call to ${member} and it will appear here automatically.`
            }
          />
        )}
      </div>
    </section>
  )
}

export function FarabiSobitPage({
  tasks,
  query,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onDeleteTask,
  onStatusChange,
  onAssignmentStateChange,
}: FarabiSobitPageProps) {
  const farabiCount = tasks.filter((task) => isAssignedTo(task, 'Farabi')).length
  const sobitCount = tasks.filter((task) => isAssignedTo(task, 'Sobit')).length

  return (
    <div className="page">
      <PageHeader
        eyebrow="Team assignments"
        title="Farabi & Sobit"
        description={
          <p>
            Every task or call assigned to Farabi or Sobit appears here automatically,
            grouped by its added and scheduled dates.
          </p>
        }
      />
      <div className="assignee-board" aria-label="Tasks assigned to Farabi and Sobit">
        <PersonColumn
          member="Farabi"
          tasks={tasks}
          allTasks={tasks}
          query={query}
          onEditTask={onEditTask}
          onCreateFollowUp={onCreateFollowUp}
          onConvertCallPoint={onConvertCallPoint}
          onShiftTask={onShiftTask}
          onDeleteTask={onDeleteTask}
          onStatusChange={onStatusChange}
          onAssignmentStateChange={onAssignmentStateChange}
        />
        <PersonColumn
          member="Sobit"
          tasks={tasks}
          allTasks={tasks}
          query={query}
          onEditTask={onEditTask}
          onCreateFollowUp={onCreateFollowUp}
          onConvertCallPoint={onConvertCallPoint}
          onShiftTask={onShiftTask}
          onDeleteTask={onDeleteTask}
          onStatusChange={onStatusChange}
          onAssignmentStateChange={onAssignmentStateChange}
        />
      </div>
      <p className="assignee-page__summary" aria-label="Assignment totals">
        Farabi: {farabiCount} assigned &nbsp;·&nbsp; Sobit: {sobitCount} assigned
      </p>
    </div>
  )
}
