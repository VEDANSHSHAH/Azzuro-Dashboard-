import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Clock3,
  Edit3,
  GitBranchPlus,
  Link2,
  MessageSquareText,
  PhoneCall,
  Pin,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  IconButton,
  PropertyBadge,
  StatusBadge,
} from '../components'
import {
  PROPERTY_OPTIONS,
  TASK_STATUS_OPTIONS,
  fromISODate,
  type Note,
  type CallPoint,
  type Task,
  type TaskAssignmentState,
  type TaskStatus,
} from '../domain'

export const propertyLabel = (property: Task['property']): string =>
  PROPERTY_OPTIONS.find((option) => option.value === property)?.label ?? property

interface NoteCardProps {
  note: Note
  onChange: (patch: Partial<Pick<Note, 'title' | 'content' | 'pinned'>>) => void
  onDelete: () => void
  compact?: boolean
}

export function NoteCard({ note, onChange, onDelete, compact = false }: NoteCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      className={`note-card${note.pinned ? ' note-card--pinned' : ''}${compact ? ' note-card--compact' : ''}`}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <div className="note-card__header">
        <input
          className="note-card__title-input"
          value={note.title}
          aria-label="Note name"
          placeholder="Untitled note"
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <div className="note-card__actions">
          <IconButton
            label={note.pinned ? 'Unpin note' : 'Pin note'}
            title={note.pinned ? 'Unpin' : 'Pin'}
            icon={Pin}
            variant="quiet"
            size="sm"
            className={note.pinned ? 'icon-button--active' : undefined}
            onClick={() => onChange({ pinned: !note.pinned })}
          />
          <IconButton
            label="Delete note"
            icon={Trash2}
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm('Delete this note?')) onDelete()
            }}
          />
        </div>
      </div>
      <textarea
        className="note-card__textarea"
        value={note.content}
        aria-label={`${note.title || 'Untitled'} note content`}
        placeholder="Start writing… everything saves automatically."
        rows={compact ? 4 : 6}
        onChange={(event) => onChange({ content: event.target.value })}
      />
      <div className="note-card__meta">
        <Clock3 aria-hidden="true" />
        Edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        {note.pinned ? <><span aria-hidden="true">·</span> Pinned</> : null}
      </div>
    </motion.article>
  )
}

interface TaskCardProps {
  task: Task
  onStatusChange: (status: TaskStatus) => void
  onAssignmentStateChange?: (state: TaskAssignmentState) => void
  onEdit: () => void
  onCreateFollowUp?: () => void
  onOpenLinkedTask?: (task: Task) => void
  onConvertCallPoint?: (point: CallPoint) => void
  onShift: () => void
  onDelete: () => void
  parentTask?: Task | null
  followUpTasks?: Task[]
  allTasks?: Task[]
  showDate?: boolean
  compact?: boolean
}

export function TaskCard({
  task,
  onStatusChange,
  onAssignmentStateChange,
  onEdit,
  onCreateFollowUp,
  onOpenLinkedTask,
  onConvertCallPoint,
  onShift,
  onDelete,
  parentTask = null,
  followUpTasks = [],
  allTasks = [],
  showDate = false,
  compact = false,
}: TaskCardProps) {
  const reduceMotion = useReducedMotion()
  const isDone = task.status === 'done'
  const isCall = task.kind === 'call'
  const handoffIsGiven = task.assignmentState === 'given'
  const statusOptions = isCall
    ? TASK_STATUS_OPTIONS.filter((option) => option.value !== 'untouched')
    : TASK_STATUS_OPTIONS

  return (
    <motion.article
      className={`task-card${isCall ? ' task-card--call' : ''}${isDone ? ' task-card--done' : ''}${compact ? ' task-card--compact' : ''}`}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0 : 0.17 }}
    >
      <div className="task-card__top">
        <button
          type="button"
          className={`task-card__check${isDone ? ' task-card__check--done' : ''}`}
          aria-label={
            isCall
              ? isDone
                ? 'Mark call scheduled'
                : 'Mark call done'
              : isDone
                ? 'Mark task untouched'
                : 'Mark task done'
          }
          onClick={() => onStatusChange(isDone ? (isCall ? 'scheduled' : 'untouched') : 'done')}
        >
          {isDone ? <Check aria-hidden="true" /> : null}
        </button>
        <div className="task-card__body">
          {isCall ? (
            <span className="task-card__kind"><PhoneCall aria-hidden="true" />Call</span>
          ) : null}
          <h3 className="task-card__title">{task.title || 'Untitled task'}</h3>
          {task.description && (!isCall || compact) ? (
            <p className="task-card__description">{task.description}</p>
          ) : null}
        </div>
        <div className="task-card__actions">
          {onCreateFollowUp ? (
            <IconButton
              label="Create linked follow-up"
              title="Create follow-up"
              icon={GitBranchPlus}
              variant="quiet"
              size="sm"
              onClick={onCreateFollowUp}
            />
          ) : null}
          <IconButton label={isCall ? 'Edit call' : 'Edit task'} icon={Edit3} variant="quiet" size="sm" onClick={onEdit} />
          <IconButton
            label={isCall ? 'Set call scheduled date' : 'Set task scheduled date'}
            title="Set scheduled date"
            icon={ArrowRightLeft}
            variant="quiet"
            size="sm"
            onClick={onShift}
          />
          <IconButton
            label={isCall ? 'Delete call' : 'Delete task'}
            icon={Trash2}
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm(`Delete this ${isCall ? 'call' : 'task'}?`)) onDelete()
            }}
          />
        </div>
      </div>
      {isCall && !compact && task.description ? (
        <div className="call-card__discussion">
          <MessageSquareText aria-hidden="true" />
          <div>
            <span>What to discuss</span>
            <p>{task.description}</p>
          </div>
        </div>
      ) : null}
      {isCall && !compact && task.callOutcome ? (
        <div className="call-card__outcome">
          <PhoneCall aria-hidden="true" />
          <div>
            <span>What I heard</span>
            <p>{task.callOutcome}</p>
          </div>
        </div>
      ) : null}
      {isCall && !compact && task.callPoints.length ? (
        <div className="call-card__points" aria-label="Call outcome points">
          <div className="call-card__points-heading">
            <strong>Outcome points</strong>
            <span>{task.callPoints.length}</span>
          </div>
          <div className="call-card__points-list">
            {task.callPoints.map((point) => {
              const convertedTask = point.convertedTaskId
                ? allTasks.find((candidate) => candidate.id === point.convertedTaskId) ?? null
                : null
              return (
                <div className="call-card__point" key={point.id}>
                  <span className="call-card__point-dot" aria-hidden="true" />
                  <span className="call-card__point-text">{point.text}</span>
                  {convertedTask ? (
                    <button
                      type="button"
                      className="call-card__point-action call-card__point-action--linked"
                      onClick={() => onOpenLinkedTask?.(convertedTask)}
                    >
                      <Link2 aria-hidden="true" />
                      Open task
                    </button>
                  ) : onConvertCallPoint ? (
                    <button
                      type="button"
                      className="call-card__point-action"
                      onClick={() => onConvertCallPoint(point)}
                    >
                      <ArrowUpRight aria-hidden="true" />
                      Turn into task
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      {!isCall && task.findings ? (
        <div className="task-card__findings">
          <span className="task-card__findings-icon" aria-hidden="true">
            <ClipboardCheck />
          </span>
          <div>
            <span className="task-card__findings-label">Findings</span>
            <p>{task.findings}</p>
          </div>
        </div>
      ) : null}
      {!compact && task.assignedTo ? (
        <section
          className={`assignment-step${
            handoffIsGiven ? ' assignment-step--given' : ' assignment-step--needs-giving'
          }`}
          aria-label={`Assignment handoff for ${task.assignedTo}`}
        >
          <span className="assignment-step__icon" aria-hidden="true">
            {handoffIsGiven ? <Check /> : <Send />}
          </span>
          <span className="assignment-step__copy">
            <small>Assignment handoff</small>
            <strong>
              {handoffIsGiven
                ? `Given to ${task.assignedTo}`
                : `Give to ${task.assignedTo}`}
            </strong>
          </span>
          {onAssignmentStateChange ? (
            <button
              type="button"
              className="assignment-step__action"
              onClick={() =>
                onAssignmentStateChange(
                  handoffIsGiven ? 'needs-giving' : 'given',
                )
              }
            >
              {handoffIsGiven ? 'Mark needs giving' : 'Mark given'}
            </button>
          ) : null}
        </section>
      ) : null}
      {parentTask || followUpTasks.length ? (
        <div className="task-card__trail" aria-label="Linked task trail">
          {parentTask ? (
            <button
              type="button"
              className="task-link task-link--parent"
              onClick={() => onOpenLinkedTask?.(parentTask)}
            >
              <Link2 aria-hidden="true" />
              <span className="task-link__copy">
                <small>Follow-up to</small>
                <strong>{parentTask.title || 'Untitled task'}</strong>
              </span>
              <time>{format(fromISODate(parentTask.date), 'd MMM')}</time>
            </button>
          ) : null}
          {followUpTasks.length ? (
            <div className="task-card__follow-ups">
              <span className="task-card__follow-ups-label">
                <GitBranchPlus aria-hidden="true" />
                {followUpTasks.length} {followUpTasks.length === 1 ? 'follow-up' : 'follow-ups'}
              </span>
              <div className="task-card__follow-up-links">
                {followUpTasks.slice(0, 3).map((followUp) => (
                  <button
                    type="button"
                    className="task-link task-link--child"
                    key={followUp.id}
                    onClick={() => onOpenLinkedTask?.(followUp)}
                  >
                    <span>{followUp.title || 'Untitled task'}</span>
                    <time>{format(fromISODate(followUp.date), 'd MMM')}</time>
                  </button>
                ))}
                {followUpTasks.length > 3 ? (
                  <span className="task-card__more-links">+{followUpTasks.length - 3} more</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="task-card__footer">
        <div className="task-card__badges">
          <PropertyBadge property={propertyLabel(task.property)} size="sm" />
          {isCall ? (
            <span className="call-badge"><PhoneCall aria-hidden="true" />{isDone ? 'Completed call' : 'Scheduled call'}</span>
          ) : null}
          {task.assignedTo ? (
            <span className="assignee-badge"><UserRound aria-hidden="true" />{task.assignedTo}</span>
          ) : null}
          {task.assignedTo ? (
            <span
              className={`assignment-badge${
                handoffIsGiven
                  ? ' assignment-badge--given'
                  : ' assignment-badge--needs-giving'
              }`}
            >
              {handoffIsGiven ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
              {handoffIsGiven ? 'Given' : 'Need to give'}
            </span>
          ) : null}
          {task.scheduledFor ? (
            <span className="task-card__scheduled-date">
              Scheduled {format(fromISODate(task.scheduledFor), 'd MMM')}
            </span>
          ) : null}
          {showDate ? <span className="task-card__date">Added {task.date}</span> : null}
        </div>
        <label className="status-select">
          <span className="sr-only">{isCall ? 'Call status' : 'Task status'}</span>
          <StatusBadge status={task.status} size="sm" />
          <select
            value={task.status}
            aria-label={`${isCall ? 'Call status' : 'Status'} for ${task.title || (isCall ? 'call' : 'task')}`}
            onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </motion.article>
  )
}
