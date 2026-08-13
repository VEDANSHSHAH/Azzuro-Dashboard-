import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button, DateNavigator, PageHeader } from '../components'
import { fromISODate, type CallPoint, type Property, type Task } from '../domain'
import type { WorkspaceApi } from '../hooks'
import { WorkBoard } from '../features/WorkBoard'
import { ReminderBanner } from '../features/ReminderBanner'

interface DayPageProps {
  workspace: WorkspaceApi
  query: string
  propertyFilter: Property
  onPropertyFilterChange: (property: Property) => void
  onAdd: () => void
  onOpenCalendar: () => void
  onEditTask: (task: Task) => void
  onCreateFollowUp: (task: Task) => void
  onConvertCallPoint: (call: Task, point: CallPoint) => void
  onShiftTask: (task: Task) => void
}

export function DayPage({
  workspace,
  query,
  propertyFilter,
  onPropertyFilterChange,
  onAdd,
  onOpenCalendar,
  onEditTask,
  onCreateFollowUp,
  onConvertCallPoint,
  onShiftTask,
}: DayPageProps) {
  const date = fromISODate(workspace.selectedDate)

  return (
    <div className="page">
      <PageHeader
        eyebrow={workspace.isToday ? 'Day-wise · Today' : 'Day-wise workspace'}
        title={format(date, 'EEEE')}
        description={<p>{format(date, 'd MMMM yyyy')} — notes and actions for this operating day.</p>}
        actions={<Button leadingIcon={Plus} onClick={onAdd}>Add work</Button>}
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
        onAdd={onAdd}
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
