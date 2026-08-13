import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import {
  CalendarClock,
  GitBranchPlus,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Button,
  IconButton,
  Modal,
  SelectField,
  TextareaField,
  TextField,
} from '../components'
import {
  fromISODate,
  PROPERTY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type CallPoint,
  type CreateNoteInput,
  type CreateTaskInput,
  type ISODate,
  type Property,
  type Task,
  type TaskStatus,
} from '../domain'

export type WorkItemKind = 'note' | 'task' | 'call'

const CALL_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
] as const

function createCallPoint(text = ''): CallPoint {
  return {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `call-point-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    convertedTaskId: null,
  }
}

interface WorkItemModalProps {
  open: boolean
  kind: WorkItemKind
  date: ISODate
  onClose: () => void
  onCreateNote: (input: CreateNoteInput) => void
  onCreateTask: (input: CreateTaskInput) => void
}

export function WorkItemModal({
  open,
  kind,
  date,
  onClose,
  onCreateNote,
  onCreateTask,
}: WorkItemModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [property, setProperty] = useState<Property>('all')
  const [status, setStatus] = useState<TaskStatus>('untouched')
  const [assignedTo, setAssignedTo] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [callPoints, setCallPoints] = useState<CallPoint[]>([])

  useEffect(() => {
    if (!open) return
    setTitle('')
    setContent('')
    setProperty('all')
    setStatus(kind === 'call' ? 'scheduled' : 'untouched')
    setAssignedTo('')
    setCallOutcome('')
    setCallPoints([])
  }, [kind, open])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (kind === 'note') {
      onCreateNote({ date, title: title.trim(), content })
      onClose()
    }
    if (kind === 'task') {
      if (!title.trim()) return
      onCreateTask({ date, title: title.trim(), description: content, property, status, assignedTo: assignedTo.trim() })
      onClose()
    }
    if (kind === 'call') {
      if (!title.trim()) return
      onCreateTask({
        kind: 'call',
        date,
        title: title.trim(),
        description: content.trim(),
        property,
        status: status === 'done' ? 'done' : 'scheduled',
        assignedTo: assignedTo.trim(),
        callOutcome: callOutcome.trim(),
        callPoints: callPoints
          .map((point) => ({ ...point, text: point.text.trim() }))
          .filter((point) => point.text),
      })
      onClose()
    }
  }

  const titleByKind =
    kind === 'note' ? 'New note' : kind === 'call' ? 'New call' : 'New task'
  const description = `For ${format(fromISODate(date), 'EEEE, d MMMM yyyy')}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleByKind}
      description={description}
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="work-item-form"
            leadingIcon={Plus}
            disabled={(kind === 'task' || kind === 'call') && !title.trim()}
          >
            Add {kind}
          </Button>
        </>
      )}
    >
      <form id="work-item-form" className="form-grid" onSubmit={submit}>
          <TextField
            label={kind === 'note' ? 'Note name' : kind === 'call' ? 'Call name' : 'Task name'}
            placeholder={kind === 'note' ? 'e.g. Morning handover' : kind === 'call' ? 'Who or what is this call about?' : 'What needs to happen?'}
            value={title}
            autoFocus
            required={kind === 'task' || kind === 'call'}
            fieldClassName="form-grid__full"
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextareaField
            label={kind === 'note' ? 'Note' : kind === 'call' ? 'What to discuss' : 'Description'}
            placeholder={kind === 'note' ? 'Start writing…' : kind === 'call' ? 'Add talking points, questions, or context for the call.' : 'Add useful context (optional)'}
            value={content}
            rows={7}
            fieldClassName="form-grid__full"
            onChange={(event) => setContent(event.target.value)}
          />
          {kind === 'task' || kind === 'call' ? (
            <>
              <SelectField
                label="Property"
                value={property}
                options={PROPERTY_OPTIONS}
                onChange={(event) => setProperty(event.target.value as Property)}
              />
              <SelectField
                label={kind === 'call' ? 'Call status' : 'Starting status'}
                value={status}
                options={kind === 'call' ? CALL_STATUS_OPTIONS : TASK_STATUS_OPTIONS}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
              />
              <TextField
                label="Assigned to"
                placeholder="e.g. Cleaner, John, Maintenance team"
                value={assignedTo}
                fieldClassName="form-grid__full"
                onChange={(event) => setAssignedTo(event.target.value)}
              />
              {kind === 'call' && status === 'done' ? (
                <>
                  <TextareaField
                    label="What I heard"
                    placeholder="Record the response, decisions, or important context from the call."
                    value={callOutcome}
                    rows={5}
                    fieldClassName="form-grid__full"
                    onChange={(event) => setCallOutcome(event.target.value)}
                  />
                  <div className="call-point-editor form-grid__full">
                    <div className="call-point-editor__header">
                      <div>
                        <strong>Outcome points</strong>
                        <span>Each saved point can be turned into a linked task.</span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        leadingIcon={Plus}
                        onClick={() => setCallPoints((current) => [...current, createCallPoint()])}
                      >
                        Add point
                      </Button>
                    </div>
                    {callPoints.length ? (
                      <div className="call-point-editor__list">
                        {callPoints.map((point, index) => (
                          <div className="call-point-editor__row" key={point.id}>
                            <TextField
                              label={`Outcome point ${index + 1}`}
                              value={point.text}
                              placeholder="e.g. Replace the broken lock in room 12"
                              onChange={(event) =>
                                setCallPoints((current) =>
                                  current.map((candidate) =>
                                    candidate.id === point.id
                                      ? { ...candidate, text: event.target.value }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                            <IconButton
                              label={`Remove outcome point ${index + 1}`}
                              icon={Trash2}
                              variant="danger"
                              onClick={() =>
                                setCallPoints((current) =>
                                  current.filter((candidate) => candidate.id !== point.id),
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="call-point-editor__empty">No individual outcome points yet.</p>
                    )}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
      </form>
    </Modal>
  )
}

type TaskEditorPatch = Partial<
  Pick<Task, 'title' | 'description' | 'findings' | 'property' | 'status' | 'assignedTo'>
>

interface TaskEditorModalProps {
  task: Task | null
  onClose: () => void
  onSave: (patch: TaskEditorPatch) => void
  onSaveAndFollowUp?: (patch: TaskEditorPatch) => void
}

export function TaskEditorModal({
  task,
  onClose,
  onSave,
  onSaveAndFollowUp,
}: TaskEditorModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [findings, setFindings] = useState('')
  const [property, setProperty] = useState<Property>('all')
  const [status, setStatus] = useState<TaskStatus>('untouched')
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description)
    setFindings(task.findings)
    setProperty(task.property)
    setStatus(task.status)
    setAssignedTo(task.assignedTo)
  }, [task])

  function createPatch(): TaskEditorPatch {
    return {
      title: title.trim(),
      description,
      findings: findings.trim(),
      property,
      status,
      assignedTo: assignedTo.trim(),
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onSave(createPatch())
    onClose()
  }

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      title="Edit task"
      description={task ? `Scheduled for ${format(fromISODate(task.date), 'd MMMM yyyy')}` : undefined}
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          {onSaveAndFollowUp ? (
            <Button
              variant="secondary"
              leadingIcon={GitBranchPlus}
              disabled={!title.trim()}
              onClick={() => {
                if (!title.trim()) return
                onSaveAndFollowUp(createPatch())
                onClose()
              }}
            >
              Save &amp; create follow-up
            </Button>
          ) : null}
          <Button type="submit" form="task-editor-form">Save changes</Button>
        </>
      )}
    >
      <form id="task-editor-form" className="form-grid" onSubmit={submit}>
        <TextField
          label="Task name"
          value={title}
          required
          autoFocus
          fieldClassName="form-grid__full"
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextareaField
          label="Description"
          value={description}
          rows={6}
          fieldClassName="form-grid__full"
          onChange={(event) => setDescription(event.target.value)}
        />
        <SelectField
          label="Property"
          value={property}
          options={PROPERTY_OPTIONS}
          onChange={(event) => setProperty(event.target.value as Property)}
        />
        <SelectField
          label="Status"
          value={status}
          options={TASK_STATUS_OPTIONS}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
        />
        <TextField
          label="Assigned to"
          placeholder="e.g. Cleaner, John, Maintenance team"
          value={assignedTo}
          fieldClassName="form-grid__full"
          onChange={(event) => setAssignedTo(event.target.value)}
        />
        <TextareaField
          label="Findings / outcome"
          placeholder="What was checked, discovered, or decided?"
          hint="Add findings while the task is assigned, scheduled, or after it is done."
          value={findings}
          rows={4}
          fieldClassName="form-grid__full"
          onChange={(event) => setFindings(event.target.value)}
        />
      </form>
    </Modal>
  )
}

interface ShiftTaskModalProps {
  task: Task | null
  onClose: () => void
  onShift: (date: ISODate) => void
}

export function ShiftTaskModal({ task, onClose, onShift }: ShiftTaskModalProps) {
  const [date, setDate] = useState<ISODate>('')

  useEffect(() => {
    if (task) setDate(task.date)
  }, [task])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!date) return
    onShift(date)
    onClose()
  }

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      title="Shift this task"
      description={task?.title || 'Choose a new working day.'}
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="shift-task-form" leadingIcon={CalendarClock}>Move task</Button>
        </>
      )}
    >
      <form id="shift-task-form" onSubmit={submit}>
        <TextField
          label="New date"
          type="date"
          value={date}
          required
          autoFocus
          hint="The task will disappear from its old day and appear on the new one."
          onChange={(event) => setDate(event.target.value)}
        />
      </form>
    </Modal>
  )
}
