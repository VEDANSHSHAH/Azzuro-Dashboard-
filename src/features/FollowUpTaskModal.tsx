import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, CalendarClock, Link2 } from 'lucide-react'
import {
  Button,
  Modal,
  SelectField,
  TextareaField,
  TextField,
} from '../components'
import {
  fromISODate,
  PROPERTY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type CreateTaskInput,
  type ISODate,
  type Property,
  type Task,
  type TaskAssignmentState,
  type TaskStatus,
} from '../domain'
import { AssignmentHandoffFields } from './AssignmentHandoffFields'

export interface FollowUpTaskModalProps {
  parentTask: Task | null
  initialTitle?: string
  initialDescription?: string
  onClose: () => void
  onCreate: (input: CreateTaskInput) => void
}

function propertyName(property: Property): string {
  return (
    PROPERTY_OPTIONS.find((option) => option.value === property)?.label ??
    property
  )
}

export function FollowUpTaskModal({
  parentTask,
  initialTitle = '',
  initialDescription = '',
  onClose,
  onCreate,
}: FollowUpTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [date, setDate] = useState('')
  const [property, setProperty] = useState<Property>('all')
  const [status, setStatus] = useState<TaskStatus>('scheduled')
  const [assignedTo, setAssignedTo] = useState('')
  const [assignmentState, setAssignmentState] =
    useState<TaskAssignmentState>('needs-giving')
  const [titleError, setTitleError] = useState<string>()
  const [dateError, setDateError] = useState<string>()

  useEffect(() => {
    if (!parentTask) return
    setTitle(initialTitle)
    setDescription(initialDescription)
    setStatusNote('')
    setDate(parentTask.date)
    setProperty(parentTask.property)
    setStatus('scheduled')
    setAssignedTo('')
    setAssignmentState('needs-giving')
    setTitleError(undefined)
    setDateError(undefined)
  }, [initialDescription, initialTitle, parentTask])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!parentTask) return

    const cleanTitle = title.trim()
    const missingTitle = !cleanTitle
    const missingDate = !date
    setTitleError(missingTitle ? 'Give the follow-up a task name.' : undefined)
    setDateError(missingDate ? 'Choose when this follow-up is due.' : undefined)
    if (missingTitle || missingDate) return

    onCreate({
      title: cleanTitle,
      description: description.trim(),
      statusNote: statusNote.trim(),
      date: date as ISODate,
      property,
      status,
      assignedTo: assignedTo.trim(),
      assignmentState,
      findings: '',
      parentTaskId: parentTask.id,
    })
    onClose()
  }

  return (
    <Modal
      open={parentTask !== null}
      onClose={onClose}
      title="Create a follow-up task"
      description={
        parentTask
          ? `This task will stay linked to “${parentTask.title || 'Untitled task'}”.`
          : undefined
      }
      className="follow-up-dialog"
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="follow-up-task-form"
            leadingIcon={ArrowUpRight}
          >
            Create follow-up
          </Button>
        </>
      )}
    >
      {parentTask ? (
        <>
          <aside className="follow-up-link" aria-label="Linked parent task">
            <span className="follow-up-link__icon" aria-hidden="true">
              <Link2 />
            </span>
            <div className="follow-up-link__copy">
              <span className="follow-up-link__eyebrow">Following up from</span>
              <strong className="follow-up-link__title">
                {parentTask.title || 'Untitled task'}
              </strong>
              <span className="follow-up-link__meta">
                {propertyName(parentTask.property)} ·{' '}
                {format(fromISODate(parentTask.date), 'd MMM yyyy')}
              </span>
            </div>
          </aside>

          <form
            id="follow-up-task-form"
            className="form-grid follow-up-form"
            noValidate
            onSubmit={submit}
          >
            <TextField
              label="Task name"
              value={title}
              required
              autoFocus
              placeholder="What needs to happen next?"
              error={titleError}
              fieldClassName="form-grid__full"
              onChange={(event) => {
                setTitle(event.target.value)
                if (titleError) setTitleError(undefined)
              }}
            />
            <TextareaField
              label="Description"
              value={description}
              rows={5}
              placeholder="Add the context needed to complete this follow-up…"
              fieldClassName="form-grid__full"
              onChange={(event) => setDescription(event.target.value)}
            />
            <TextareaField
              label="Task status note"
              value={statusNote}
              rows={4}
              placeholder="What is happening now? Add updates, blockers, or approvals."
              hint="Optional. This is a live progress note, separate from the description."
              fieldClassName="form-grid__full"
              onChange={(event) => setStatusNote(event.target.value)}
            />
            <TextField
              label="Scheduled date"
              type="date"
              value={date}
              required
              error={dateError}
              onChange={(event) => {
                setDate(event.target.value)
                if (dateError) setDateError(undefined)
              }}
            />
            <SelectField
              label="Property"
              value={property}
              options={PROPERTY_OPTIONS}
              onChange={(event) => setProperty(event.target.value as Property)}
            />
            <SelectField
              label="Starting status"
              value={status}
              options={TASK_STATUS_OPTIONS}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            />
            <AssignmentHandoffFields
              assignedTo={assignedTo}
              assignmentState={assignmentState}
              onAssignedToChange={setAssignedTo}
              onAssignmentStateChange={setAssignmentState}
            />
            <div className="follow-up-form__inheritance form-grid__full">
              <CalendarClock aria-hidden="true" />
              <span>
                Date and property are inherited from the original task, but can
                be changed before creating the follow-up.
              </span>
            </div>
          </form>
        </>
      ) : null}
    </Modal>
  )
}
