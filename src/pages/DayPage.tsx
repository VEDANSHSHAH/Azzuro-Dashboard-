import { format } from 'date-fns'
import { CheckCircle2, Copy, PhoneCall, Plus } from 'lucide-react'
import { Button, DateNavigator, PageHeader } from '../components'
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

interface DayPageProps {
  workspace: WorkspaceApi
  query: string
  propertyFilter: Property
  onPropertyFilterChange: (property: Property) => void
  onAddNote: () => void
  onAddTask: () => void
  onAddCall: () => void
  onOpenCalendar: () => void
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
  onAssignmentStateChange: (id: string, state: TaskAssignmentState) => void
  showNotDoneOnly: boolean
  onToggleNotDone: () => void
  onCopyAll: (data: WorkdayCopyData) => void
}

export function DayPage({
  workspace,
  query,
  propertyFilter,
  onPropertyFilterChange,
  onAddNote,
  onAddTask,
  onAddCall,
  onOpenCalendar,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
  onAssignmentStateChange,
  showNotDoneOnly,
  onToggleNotDone,
  onCopyAll,
}: DayPageProps) {
  const date = fromISODate(workspace.selectedDate)
  const notDoneCount = workspace.selectedTasks.filter((task) => task.status !== 'done').length

  return (
    <div className="page">
      <PageHeader
        eyebrow={workspace.isToday ? 'Day-wise · Today' : 'Day-wise workspace'}
        title={format(date, 'EEEE')}
        description={<p>{format(date, 'd MMMM yyyy')} — notes and actions for this operating day.</p>}
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
                date: workspace.selectedDate,
                notes: workspace.selectedNotes,
                tasks: workspace.selectedTasks,
                allTasks: workspace.data.tasks,
              })}
            >
              Copy all
            </Button>
            <Button variant="secondary" leadingIcon={PhoneCall} onClick={onAddCall}>Add call</Button>
            <Button leadingIcon={Plus} onClick={onAddTask}>Add task</Button>
          </>
        }
      />
      <div className="date-bar">
        <DateNavigator
          date={date}
          onPrevious={workspace.goToPreviousDay}
          onNext={workspace.goToNextDay}
          onToday={workspace.goToToday}
          onOpenCalendar={onOpenCalendar}
        />
        <span className="date-bar__hint">This page always opens on today when you launch MYWORK AZZURO.</span>
      </div>
      <ReminderBanner reminders={workspace.data.reminders} date={workspace.selectedDate} />
      <WorkBoard
        notes={workspace.selectedNotes}
        tasks={workspace.selectedTasks}
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
