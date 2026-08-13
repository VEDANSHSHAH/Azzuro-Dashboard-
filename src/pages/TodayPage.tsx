import { format } from 'date-fns'
import { ArrowRight, CheckCircle2, Copy, PhoneCall, Plus } from 'lucide-react'
import { Button, PageHeader } from '../components'
import {
  fromISODate,
  type CallPoint,
  type Property,
  type Task,
  type TaskAssignmentState,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import { WorkBoard } from '../features/WorkBoard'
import { ReminderBanner } from '../features/ReminderBanner'
import type { WorkdayCopyData } from '../features/workday-copy'

interface TodayPageProps {
  workspace: WorkspaceApi
  query: string
  propertyFilter: Property
  onPropertyFilterChange: (property: Property) => void
  onAddNote: () => void
  onAddTask: () => void
  onAddCall: () => void
  onOpenDay: () => void
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onAssignmentStateChange: (id: string, state: TaskAssignmentState) => void
  showNotDoneOnly: boolean
  onToggleNotDone: () => void
  onCopyAll: (data: WorkdayCopyData) => void
}

export function TodayPage({
  workspace,
  query,
  propertyFilter,
  onPropertyFilterChange,
  onAddNote,
  onAddTask,
  onAddCall,
  onOpenDay,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onAssignmentStateChange,
  showNotDoneOnly,
  onToggleNotDone,
  onCopyAll,
}: TodayPageProps) {
  const date = fromISODate(workspace.today)
  const notDoneCount = workspace.todayTasks.filter((task) => task.status !== 'done').length

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${format(date, 'EEEE')} · Daily overview`}
        title="Today’s work"
        description={
          <p>{format(date, 'd MMMM yyyy')} — your notes and tasks from today’s Day-wise page, together in one place.</p>
        }
        actions={
          <>
            <Button
              variant={showNotDoneOnly ? 'primary' : 'secondary'}
              leadingIcon={CheckCircle2}
              aria-pressed={showNotDoneOnly}
              onClick={onToggleNotDone}
            >
              Not done ({notDoneCount})
            </Button>
            <Button
              variant="secondary"
              leadingIcon={Copy}
              onClick={() => onCopyAll({
                date: workspace.today,
                notes: workspace.todayNotes,
                tasks: workspace.todayTasks,
                allTasks: workspace.data.tasks,
              })}
            >
              Copy all
            </Button>
            <Button variant="secondary" trailingIcon={ArrowRight} onClick={onOpenDay}>Open day</Button>
            <Button variant="secondary" leadingIcon={PhoneCall} onClick={onAddCall}>Add call</Button>
            <Button leadingIcon={Plus} onClick={onAddTask}>Add task</Button>
          </>
        }
      />
      <ReminderBanner reminders={workspace.data.reminders} date={workspace.today} />
      <WorkBoard
        notes={workspace.todayNotes}
        tasks={workspace.todayTasks}
        allTasks={workspace.data.tasks}
        query={query}
        propertyFilter={propertyFilter}
        onPropertyFilterChange={onPropertyFilterChange}
        onAddNote={onAddNote}
        onAddTask={onAddTask}
        onAddCall={onAddCall}
        onUpdateNote={workspace.updateNote}
        onDeleteNote={workspace.deleteNote}
        onEditTask={onEditTask}
        onCreateFollowUp={onCreateFollowUp}
        onConvertCallPoint={onConvertCallPoint}
        onShiftTask={onShiftTask}
        onDeleteTask={workspace.deleteTask}
        onStatusChange={workspace.changeTaskStatus}
        onAssignmentStateChange={onAssignmentStateChange}
        showNotDoneOnly={showNotDoneOnly}
      />
    </div>
  )
}
