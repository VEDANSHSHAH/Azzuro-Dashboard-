import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpenText,
  BellRing,
  CalendarRange,
  CalendarCheck2,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AppShell,
  Button,
  SaveIndicator,
  ToastViewport,
  type NavigationItem,
  type ToastMessage,
} from './components'
import { CalendarModal } from './features/CalendarModal'
import {
  ShiftTaskModal,
  TaskEditorModal,
  WorkItemModal,
  type WorkItemKind,
} from './features/work-modals'
import { FollowUpTaskModal } from './features/FollowUpTaskModal'
import { CallEditorModal } from './features/CallEditorModal'
import { copyTextToClipboard, formatWorkdayForClipboard, type WorkdayCopyData } from './features/workday-copy'
import { useWorkspace } from './hooks'
import type { CallPoint, Property, Task, TaskAssignmentState } from './domain'
import { CleaningPage } from './pages/CleaningPage'
import { DayPage } from './pages/DayPage'
import { LinksPage } from './pages/LinksPage'
import { RulesPage } from './pages/RulesPage'
import { TodayPage } from './pages/TodayPage'
import { ThingsToRememberPage } from './pages/ThingsToRememberPage'
import { FarabiSobitPage } from './pages/FarabiSobitPage'

type PageId = 'today' | 'day' | 'reminders' | 'cleaning' | 'rules' | 'links' | 'assignments'

const navigation: readonly NavigationItem[] = [
  { id: 'today', label: 'Today’s Work', icon: CalendarCheck2 },
  { id: 'day', label: 'Day-wise', icon: CalendarRange },
  { id: 'reminders', label: 'Things to Remember', icon: BellRing },
  { id: 'cleaning', label: 'Cleaning', icon: Sparkles },
  { id: 'rules', label: 'General Rules', icon: BookOpenText },
  { id: 'links', label: 'Links & Credentials', icon: Link2 },
  { id: 'assignments', label: 'Farabi & Sobit', icon: UsersRound },
]

const pageSearchLabels: Record<PageId, string> = {
  today: 'Search today’s work',
  day: 'Search this day',
  reminders: 'Search things to remember',
  cleaning: 'Search cleaning logs',
  rules: 'Search general rules',
  links: 'Search links and usernames',
  assignments: 'Search Farabi and Sobit work',
}

function App() {
  const workspace = useWorkspace()
  const reduceMotion = useReducedMotion()
  const [activePage, setActivePage] = useState<PageId>('today')
  const [query, setQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState<Property>('all')
  const [showNotDoneOnly, setShowNotDoneOnly] = useState(false)
  const [workItemKind, setWorkItemKind] = useState<WorkItemKind | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingCall, setEditingCall] = useState<Task | null>(null)
  const [followUpParent, setFollowUpParent] = useState<Task | null>(null)
  const [convertingCallPoint, setConvertingCallPoint] = useState<{
    call: Task
    point: CallPoint
  } | null>(null)
  const [shiftingTask, setShiftingTask] = useState<Task | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const notify = useCallback((title: string, description?: string, tone: ToastMessage['tone'] = 'success') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, title, description, tone, duration: 2600 }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  function navigate(page: string) {
    if (!navigation.some((item) => item.id === page)) return
    setActivePage(page as PageId)
    setQuery('')
  }

  function openTodayDay() {
    workspace.goToToday()
    setActivePage('day')
    setQuery('')
  }

  function openWorkItem(kind: WorkItemKind) {
    setWorkItemKind(kind)
  }

  function handleEditTask(task: Task) {
    setCalendarOpen(false)
    if (task.kind === 'call') {
      setEditingTask(null)
      setEditingCall(task)
    } else {
      setEditingCall(null)
      setEditingTask(task)
    }
  }

  function handleCreateFollowUp(task: Task) {
    setConvertingCallPoint(null)
    setFollowUpParent(task)
  }

  function handleConvertCallPoint(call: Task, point: CallPoint) {
    setConvertingCallPoint({ call, point })
    setFollowUpParent(call)
  }

  function closeFollowUp() {
    setFollowUpParent(null)
    setConvertingCallPoint(null)
  }

  function handleShiftTask(task: Task) {
    setCalendarOpen(false)
    setShiftingTask(task)
  }

  function handleAssignmentStateChange(
    id: string,
    state: TaskAssignmentState,
  ) {
    workspace.updateTask(id, { assignmentState: state })
    notify(
      state === 'given' ? 'Handoff marked given' : 'Handoff needs giving',
    )
  }

  async function handleCopyAll(data: WorkdayCopyData) {
    try {
      await copyTextToClipboard(formatWorkdayForClipboard(data))
      notify('Day copied', 'Notes, tasks, calls, findings, and handoff details are ready to paste.')
    } catch {
      notify('Could not copy the day', 'Please try again.', 'error')
    }
  }

  const workModalDate = activePage === 'today' ? workspace.today : workspace.selectedDate

  if (workspace.accessState !== 'ready') {
    if (workspace.accessState === 'loading') {
      return (
        <main className="workspace-loading" aria-live="polite">
          <div className="workspace-loading__mark" aria-hidden="true">MA</div>
          <p className="page__eyebrow">MYWORK AZZURO</p>
          <h1>Opening your private workspace</h1>
          <p>Connecting securely to your operations data.</p>
        </main>
      )
    }

    return (
      <main className="workspace-loading workspace-loading--error" aria-live="assertive">
        <div className="workspace-loading__mark" aria-hidden="true">MA</div>
        <p className="page__eyebrow">MYWORK AZZURO</p>
        <h1>Could not open your workspace</h1>
        <p>{workspace.authError ?? 'Check your connection and try again.'}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    )
  }

  return (
    <AppShell
      items={navigation}
      activeItem={activePage}
      onNavigate={navigate}
      footer={
        <div className="sidebar__privacy">
          <ShieldCheck aria-hidden="true" />
          <span>Private device workspace</span>
        </div>
      }
    >
      <div className="topbar">
        <div className="topbar__eyebrow">Personal operations workspace</div>
        <div className="topbar__right">
          <label className="search-box">
            <Search aria-hidden="true" />
            <span className="sr-only">{pageSearchLabels[activePage]}</span>
            <input
              ref={searchInputRef}
              value={query}
              placeholder={pageSearchLabels[activePage]}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </label>
          <SaveIndicator state={workspace.saveState} savedLabel="Autosaved" />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activePage}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.19, ease: 'easeOut' }}
        >
          {activePage === 'today' ? (
            <TodayPage
              workspace={workspace}
              query={query}
              propertyFilter={propertyFilter}
              onPropertyFilterChange={setPropertyFilter}
              onAddNote={() => openWorkItem('note')}
              onAddTask={() => openWorkItem('task')}
              onAddCall={() => openWorkItem('call')}
              onOpenDay={openTodayDay}
              onEditTask={handleEditTask}
              onCreateFollowUp={handleCreateFollowUp}
              onConvertCallPoint={handleConvertCallPoint}
              onShiftTask={handleShiftTask}
              onAssignmentStateChange={handleAssignmentStateChange}
              showNotDoneOnly={showNotDoneOnly}
              onToggleNotDone={() => setShowNotDoneOnly((current) => !current)}
              onCopyAll={handleCopyAll}
            />
          ) : null}
          {activePage === 'day' ? (
            <DayPage
              workspace={workspace}
              query={query}
              propertyFilter={propertyFilter}
              onPropertyFilterChange={setPropertyFilter}
              onAddNote={() => openWorkItem('note')}
              onAddTask={() => openWorkItem('task')}
              onAddCall={() => openWorkItem('call')}
              onOpenCalendar={() => setCalendarOpen(true)}
              onEditTask={handleEditTask}
              onCreateFollowUp={handleCreateFollowUp}
              onConvertCallPoint={handleConvertCallPoint}
              onShiftTask={handleShiftTask}
              onAssignmentStateChange={handleAssignmentStateChange}
              showNotDoneOnly={showNotDoneOnly}
              onToggleNotDone={() => setShowNotDoneOnly((current) => !current)}
              onCopyAll={handleCopyAll}
            />
          ) : null}
          {activePage === 'reminders' ? <ThingsToRememberPage workspace={workspace} query={query} /> : null}
          {activePage === 'cleaning' ? <CleaningPage workspace={workspace} query={query} /> : null}
          {activePage === 'rules' ? <RulesPage workspace={workspace} query={query} /> : null}
          {activePage === 'links' ? <LinksPage workspace={workspace} query={query} /> : null}
          {activePage === 'assignments' ? (
            <FarabiSobitPage
              tasks={workspace.data.tasks}
              query={query}
              onEditTask={handleEditTask}
              onCreateFollowUp={handleCreateFollowUp}
              onConvertCallPoint={handleConvertCallPoint}
              onShiftTask={handleShiftTask}
              onDeleteTask={workspace.deleteTask}
              onStatusChange={workspace.changeTaskStatus}
              onAssignmentStateChange={handleAssignmentStateChange}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <WorkItemModal
        open={workItemKind !== null}
        kind={workItemKind ?? 'task'}
        date={workModalDate}
        onClose={() => setWorkItemKind(null)}
        onCreateNote={(input) => {
          workspace.addNote(input)
          notify('Note added', 'It is already being autosaved.')
        }}
        onCreateTask={(input) => {
          workspace.addTask(input)
          notify(
            input.kind === 'call' ? 'Call added' : 'Task added',
            input.kind === 'call'
              ? 'It is in the task list with your talking points.'
              : 'You can change its status or shift it at any time.',
          )
        }}
      />
      <TaskEditorModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(patch) => {
          if (!editingTask) return
          workspace.updateTask(editingTask.id, patch)
          notify('Task updated')
        }}
        onSaveAndFollowUp={(patch) => {
          if (!editingTask) return
          workspace.updateTask(editingTask.id, patch)
          handleCreateFollowUp({ ...editingTask, ...patch })
          notify('Findings saved', 'Now add the linked next action.')
        }}
      />
      <CallEditorModal
        call={editingCall}
        onClose={() => setEditingCall(null)}
        onSave={(patch) => {
          if (!editingCall) return
          workspace.updateTask(editingCall.id, patch)
          notify('Call updated', 'The discussion and outcome points are autosaved.')
        }}
      />
      <FollowUpTaskModal
        parentTask={followUpParent}
        initialTitle={convertingCallPoint?.point.text ?? ''}
        initialDescription={
          convertingCallPoint
            ? `Created from the call outcome: ${convertingCallPoint.point.text}`
            : ''
        }
        onClose={closeFollowUp}
        onCreate={(input) => {
          if (!followUpParent) return
          if (convertingCallPoint) {
            workspace.convertCallPointToTask(
              convertingCallPoint.call.id,
              convertingCallPoint.point.id,
              input,
            )
            notify('Outcome turned into a task', 'The call point and new task stay linked.')
          } else {
            workspace.addLinkedTask(followUpParent.id, input)
            notify('Follow-up created', `Linked to ${followUpParent.title || 'the original task'}.`)
          }
        }}
      />
      <ShiftTaskModal
        task={shiftingTask}
        onClose={() => setShiftingTask(null)}
        onShift={(date) => {
          if (!shiftingTask) return
          workspace.shiftTask(shiftingTask.id, date)
          if (shiftingTask.status === 'untouched') workspace.changeTaskStatus(shiftingTask.id, 'scheduled')
          notify('Task shifted', 'The task now appears on its new day.')
        }}
      />
      <CalendarModal
        open={calendarOpen}
        selectedDate={workspace.selectedDate}
        tasks={workspace.data.tasks}
        onClose={() => setCalendarOpen(false)}
        onOpenDay={(date) => {
          workspace.selectDate(date)
          setActivePage('day')
        }}
        onEditTask={handleEditTask}
        onShiftTask={handleShiftTask}
        onDeleteTask={workspace.deleteTask}
        onStatusChange={workspace.changeTaskStatus}
        onAssignmentStateChange={handleAssignmentStateChange}
      />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AppShell>
  )
}

export default App
