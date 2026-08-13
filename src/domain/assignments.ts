import {
  TASK_ASSIGNMENT_STATES,
  type TaskAssignmentState,
} from './models'

/** Normalizes an assignment handoff. An assignee always starts as needing a handoff. */
export function normalizeAssignmentState(
  assignedTo: string,
  state: unknown,
): TaskAssignmentState | null {
  if (!assignedTo.trim()) return null

  return TASK_ASSIGNMENT_STATES.includes(state as TaskAssignmentState)
    ? (state as TaskAssignmentState)
    : 'needs-giving'
}
