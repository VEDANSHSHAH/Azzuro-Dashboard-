import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { CirclePlus, Link2, ListChecks, PhoneCall, Trash2 } from 'lucide-react'
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
  type CallPoint,
  type Property,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from '../domain'

export interface CallEditorModalProps {
  call: Task | null
  onClose: () => void
  onSave: (patch: UpdateTaskInput) => void
}

interface DraftCallPoint {
  id: string | null
  text: string
  convertedTaskId: string | null
}

const callStatusOptions: ReadonlyArray<{
  value: Extract<TaskStatus, 'scheduled' | 'done'>
  label: string
}> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
]

function emptyPoint(): DraftCallPoint {
  return { id: null, text: '', convertedTaskId: null }
}

function createPointId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  return `call-point-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

function toDraftPoint(point: CallPoint): DraftCallPoint {
  return {
    id: point.id,
    text: point.text,
    convertedTaskId: point.convertedTaskId,
  }
}

export function CallEditorModal({
  call,
  onClose,
  onSave,
}: CallEditorModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [property, setProperty] = useState<Property>('all')
  const [status, setStatus] = useState<Extract<TaskStatus, 'scheduled' | 'done'>>(
    'scheduled',
  )
  const [assignedTo, setAssignedTo] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [callPoints, setCallPoints] = useState<DraftCallPoint[]>([])
  const [titleError, setTitleError] = useState<string>()

  useEffect(() => {
    if (!call) return

    setTitle(call.title)
    setDescription(call.description)
    setProperty(call.property)
    setStatus(call.status === 'done' ? 'done' : 'scheduled')
    setAssignedTo(call.assignedTo)
    setCallOutcome(call.callOutcome)
    setCallPoints(
      call.callPoints.length ? call.callPoints.map(toDraftPoint) : [emptyPoint()],
    )
    setTitleError(undefined)
  }, [call])

  function updatePoint(index: number, text: string) {
    setCallPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index ? { ...point, text } : point,
      ),
    )
  }

  function removePoint(index: number) {
    setCallPoints((current) =>
      current.filter((_, pointIndex) => pointIndex !== index),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setTitleError('Give this call a clear title.')
      return
    }

    const savedPoints: CallPoint[] = callPoints
      .filter((point) => Boolean(point.text.trim() || point.convertedTaskId))
      .map((point) => ({
        id: point.id ?? createPointId(),
        text: point.text.trim(),
        convertedTaskId: point.convertedTaskId,
      }))

    onSave({
      title: cleanTitle,
      description: description.trim(),
      property,
      status,
      assignedTo: assignedTo.trim(),
      callOutcome: callOutcome.trim(),
      callPoints: savedPoints,
    })
    onClose()
  }

  return (
    <Modal
      open={call !== null}
      onClose={onClose}
      title="Edit call"
      description={
        call
          ? `${format(fromISODate(call.date), 'd MMMM yyyy')} · Keep the discussion and its outcomes together.`
          : undefined
      }
      className="call-editor-dialog"
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="call-editor-form" leadingIcon={PhoneCall}>
            Save call
          </Button>
        </>
      )}
    >
      {call ? (
        <form
          id="call-editor-form"
          className="form-grid call-editor-form"
          noValidate
          onSubmit={submit}
        >
          <TextField
            label="Call title"
            value={title}
            required
            autoFocus
            placeholder="Who or what is this call about?"
            error={titleError}
            fieldClassName="form-grid__full"
            onChange={(event) => {
              setTitle(event.target.value)
              if (titleError) setTitleError(undefined)
            }}
          />
          <TextareaField
            label="What to discuss"
            value={description}
            rows={5}
            placeholder="Questions, context, decisions needed…"
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
            options={callStatusOptions}
            onChange={(event) =>
              setStatus(event.target.value as Extract<TaskStatus, 'scheduled' | 'done'>)
            }
          />
          <TextField
            label="Assigned to"
            value={assignedTo}
            placeholder="Optional"
            fieldClassName="form-grid__full"
            onChange={(event) => setAssignedTo(event.target.value)}
          />
          <TextareaField
            label="What I heard"
            value={callOutcome}
            rows={6}
            placeholder="Capture the important details from the conversation…"
            hint={
              status === 'done'
                ? 'Record the facts, decisions, and context you learned during the completed call.'
                : 'This can be filled in during the call or after it is completed.'
            }
            fieldClassName="form-grid__full call-editor-form__outcome"
            onChange={(event) => setCallOutcome(event.target.value)}
          />

          <section
            className="call-points form-grid__full"
            aria-labelledby="call-points-heading"
          >
            <div className="call-points__header">
              <div className="call-points__heading-group">
                <span className="call-points__icon" aria-hidden="true">
                  <ListChecks />
                </span>
                <div>
                  <h3 className="call-points__title" id="call-points-heading">
                    Outcome points
                  </h3>
                  <p className="call-points__description">
                    Keep each action or conclusion separate so it can become a task.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={CirclePlus}
                onClick={() => setCallPoints((current) => [...current, emptyPoint()])}
              >
                Add point
              </Button>
            </div>

            <div className="call-points__list">
              {callPoints.map((point, index) => (
                <div
                  className={`call-point-row${
                    point.convertedTaskId ? ' call-point-row--converted' : ''
                  }`}
                  key={point.id ?? `new-${index}`}
                >
                  <TextField
                    label={`Outcome point ${index + 1}`}
                    value={point.text}
                    placeholder="Add an action, decision, or useful detail"
                    fieldClassName="call-point-row__field"
                    onChange={(event) => updatePoint(index, event.target.value)}
                  />
                  {point.convertedTaskId ? (
                    <span className="call-point-row__converted" title="This point is linked to a task">
                      <Link2 aria-hidden="true" />
                      Task created
                    </span>
                  ) : null}
                  <IconButton
                    className="call-point-row__remove"
                    label={`Remove outcome point ${index + 1}`}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    onClick={() => removePoint(index)}
                  />
                </div>
              ))}
              {!callPoints.length ? (
                <p className="call-points__empty">
                  No outcome points yet. Add one when the call produces an action or decision.
                </p>
              ) : null}
            </div>
          </section>
        </form>
      ) : null}
    </Modal>
  )
}
