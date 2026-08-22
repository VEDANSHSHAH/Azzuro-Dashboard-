import { format } from 'date-fns'
import { ArrowRight, BellRing, CalendarDays, Sparkles } from 'lucide-react'
import { Button, Modal } from '../components'
import { fromISODate, type ISODate, type Reminder } from '../domain'
import { formatReminderSchedule } from './reminder-utils'

export interface TodayReminderModalProps {
  open: boolean
  date: ISODate
  reminders: readonly Reminder[]
  onClose: () => void
  onViewAll: () => void
}

/** A once-per-launch prompt for the reminders that apply on the current day. */
export function TodayReminderModal({
  open,
  date,
  reminders,
  onClose,
  onViewAll,
}: TodayReminderModalProps) {
  const dayLabel = format(fromISODate(date), 'EEEE, d MMMM')
  const countLabel = reminders.length === 1 ? '1 reminder' : `${reminders.length} reminders`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Today’s reminders"
      description={`A quick check-in for ${dayLabel}.`}
      className="today-reminder-dialog"
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Continue to today</Button>
          <Button trailingIcon={ArrowRight} onClick={onViewAll}>View all reminders</Button>
        </>
      )}
    >
      <div className="today-reminder-dialog__content">
        <div className="today-reminder-dialog__welcome">
          <span className="today-reminder-dialog__mark" aria-hidden="true">
            <BellRing />
          </span>
          <div>
            <p>Good morning</p>
            <h3>{countLabel} to keep in sight</h3>
          </div>
          <Sparkles aria-hidden="true" />
        </div>

        <div className="today-reminder-dialog__list" role="list">
          {reminders.map((reminder) => (
            <article className="today-reminder-dialog__item" key={reminder.id} role="listitem">
              <span className="today-reminder-dialog__item-icon" aria-hidden="true">
                <CalendarDays />
              </span>
              <div className="today-reminder-dialog__item-copy">
                <strong>{reminder.title || 'Untitled reminder'}</strong>
                {reminder.content ? <p>{reminder.content}</p> : null}
                <span>{formatReminderSchedule(reminder)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  )
}
