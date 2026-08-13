import { format } from 'date-fns'
import { ArrowRight, PhoneCall, Plus } from 'lucide-react'
import { Button, PageHeader } from '../components'
import { fromISODate, type CallPoint, type Property, type Task } from '../domain'
import type { WorkspaceApi } from '../hooks'
import { WorkBoard } from '../features/WorkBoard'
import { ReminderBanner } from '../features/ReminderBanner'

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
}: TodayPageProps) {
  const date = fromISODate(workspace.today)

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
      />
    </div>
  )
}
