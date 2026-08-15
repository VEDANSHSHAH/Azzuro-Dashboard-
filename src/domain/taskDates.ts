import type { ISODate, Task } from './models'

/** True when a task belongs on a Day-wise calendar date. */
export function isTaskForDate(task: Task, date: ISODate): boolean {
  return task.date === date || task.scheduledFor === date
}

/** The optional Day-wise date plus a scheduled date, without duplicates. */
export function getTaskDates(task: Task): ISODate[] {
  return [task.date, task.scheduledFor].filter(
    (value, index, all): value is ISODate => Boolean(value) && all.indexOf(value) === index,
  )
}
