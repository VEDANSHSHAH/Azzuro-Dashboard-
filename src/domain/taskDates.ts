import type { ISODate, Task } from './models'

/** True when a task belongs on a Day-wise calendar date. */
export function isTaskForDate(task: Task, date: ISODate): boolean {
  return task.date === date || task.scheduledFor === date
}

/** The creation date plus the optional scheduled date, without duplicates. */
export function getTaskDates(task: Task): ISODate[] {
  return task.scheduledFor && task.scheduledFor !== task.date
    ? [task.date, task.scheduledFor]
    : [task.date]
}
