import { Check, Send } from 'lucide-react'
import { SegmentedControl, TextField } from '../components'
import type { TaskAssignmentState } from '../domain'

const handoffOptions = [
  { value: 'needs-giving', label: 'Need to give', icon: Send },
  { value: 'given', label: 'Given to them', icon: Check },
] as const

export interface AssignmentHandoffFieldsProps {
  assignedTo: string
  assignmentState: TaskAssignmentState
  onAssignedToChange: (value: string) => void
  onAssignmentStateChange: (value: TaskAssignmentState) => void
}

/** Shared assignment fields for task, call, and follow-up editors. */
export function AssignmentHandoffFields({
  assignedTo,
  assignmentState,
  onAssignedToChange,
  onAssignmentStateChange,
}: AssignmentHandoffFieldsProps) {
  const recipient = assignedTo.trim()

  return (
    <>
      <TextField
        label="Give to"
        placeholder="e.g. Farabi, Sobit, Vincent, Cleaner"
        hint="Optional. Farabi, Sobit, and Vincent appear automatically on their dedicated assignment page."
        value={assignedTo}
        fieldClassName="form-grid__full"
        list="team-member-suggestions"
        onChange={(event) => onAssignedToChange(event.target.value)}
      />
      <datalist id="team-member-suggestions">
        <option value="Farabi" />
        <option value="Sobit" />
        <option value="Vincent" />
      </datalist>
      {recipient ? (
        <div className="assignment-handoff-form form-grid__full">
          <span className="assignment-handoff-form__question">
            Have you given this task to <strong>{recipient}</strong>?
          </span>
          <SegmentedControl
            label="Assignment handoff status"
            value={assignmentState}
            options={handoffOptions}
            onChange={onAssignmentStateChange}
          />
        </div>
      ) : null}
    </>
  )
}
