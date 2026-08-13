import type { Task } from './models'

type TaskLink = Pick<Task, 'id' | 'parentTaskId'>

function parentMap(tasks: readonly TaskLink[]): Map<string, string | null> {
  return new Map(tasks.map((task) => [task.id, task.parentTaskId]))
}
/**
 * Returns true when assigning candidateParentTaskId would make taskId part of a
 * cycle, or would attach it to an already-cyclic ancestry chain.
 */
export function wouldCreateTaskCycle(
  taskId: string,
  candidateParentTaskId: string,
  tasks: readonly TaskLink[],
): boolean {
  const parents = parentMap(tasks)
  const visited = new Set<string>()
  let current: string | null = candidateParentTaskId

  while (current !== null) {
    if (current === taskId || visited.has(current)) return true
    visited.add(current)
    current = parents.get(current) ?? null
  }

  return false
}

/** Normalizes a requested parent to an existing, non-self, cycle-safe task ID. */
export function normalizeTaskParentId(
  candidateParentTaskId: string | null | undefined,
  taskId: string,
  tasks: readonly TaskLink[],
): string | null {
  if (
    !candidateParentTaskId ||
    candidateParentTaskId === taskId ||
    !tasks.some((task) => task.id === candidateParentTaskId)
  ) {
    return null
  }

  return wouldCreateTaskCycle(taskId, candidateParentTaskId, tasks)
    ? null
    : candidateParentTaskId
}

/**
 * Repairs loaded task links. Invalid/self links are cleared first. For each
 * multi-task cycle, the lexicographically greatest task ID loses its parent,
 * making the result deterministic regardless of persisted array order.
 */
export function repairTaskParentLinks(tasks: readonly Task[]): Task[] {
  const taskIds = new Set(tasks.map((task) => task.id))
  const parents = new Map<string, string | null>()

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId
    parents.set(
      task.id,
      parentTaskId !== null &&
        parentTaskId !== task.id &&
        taskIds.has(parentTaskId)
        ? parentTaskId
        : null,
    )
  }

  const resolved = new Set<string>()
  const sortedTaskIds = [...taskIds].sort()

  for (const startTaskId of sortedTaskIds) {
    if (resolved.has(startTaskId)) continue

    const path: string[] = []
    const pathIndexes = new Map<string, number>()
    let current: string | null = startTaskId

    while (current !== null && !resolved.has(current)) {
      const cycleStart = pathIndexes.get(current)
      if (cycleStart !== undefined) {
        const cycleTaskIds = path.slice(cycleStart)
        const taskIdToUnlink = cycleTaskIds.reduce((greatest, taskId) =>
          taskId > greatest ? taskId : greatest,
        )
        parents.set(taskIdToUnlink, null)
        break
      }

      pathIndexes.set(current, path.length)
      path.push(current)
      current = parents.get(current) ?? null
    }

    for (const taskId of path) resolved.add(taskId)
  }

  return tasks.map((task) => ({
    ...task,
    parentTaskId: parents.get(task.id) ?? null,
  }))
}
