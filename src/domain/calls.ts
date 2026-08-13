import type { CallPoint, Task, TaskKind, TaskStatus } from './models'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function stablePointId(ownerTaskId: string, index: number, text: string): string {
  const source = `${ownerTaskId}\u0000${index}\u0000${text}`
  let hash = 2166136261

  for (let position = 0; position < source.length; position += 1) {
    hash ^= source.charCodeAt(position)
    hash = Math.imul(hash, 16777619)
  }

  return `call_point_${(hash >>> 0).toString(36)}`
}

export function normalizeTaskKind(value: unknown): TaskKind {
  return value === 'call' ? 'call' : 'task'
}

export function normalizeTaskStatusForKind(
  kind: TaskKind,
  status: TaskStatus,
): TaskStatus {
  return kind === 'call' && status === 'untouched' ? 'scheduled' : status
}

/**
 * Cleans call points from persisted or UI input. Generated IDs are derived
 * from the owning task, point position, and text so malformed legacy data gets
 * the same ID on every normalization pass.
 */
export function normalizeCallPoints(
  value: unknown,
  ownerTaskId: string,
): CallPoint[] {
  if (!Array.isArray(value)) return []

  const points: CallPoint[] = []
  const usedIds = new Set<string>()

  value.forEach((candidate, index) => {
    if (!isRecord(candidate) || typeof candidate.text !== 'string') return

    const text = candidate.text.trim()
    if (!text) return

    const suppliedId =
      typeof candidate.id === 'string' ? candidate.id.trim() : ''
    const baseId = suppliedId || stablePointId(ownerTaskId, index, text)
    let id = baseId
    let suffix = 2

    while (usedIds.has(id)) {
      id = `${baseId}_${suffix}`
      suffix += 1
    }
    usedIds.add(id)

    const convertedTaskId =
      typeof candidate.convertedTaskId === 'string' &&
      candidate.convertedTaskId.trim()
        ? candidate.convertedTaskId.trim()
        : null

    points.push({ id, text, convertedTaskId })
  })

  return points
}

/** Clears dangling and self-targeting converted-task references. */
export function repairCallPointTaskReferences(tasks: readonly Task[]): Task[] {
  const taskIds = new Set(tasks.map((task) => task.id))

  return tasks.map((task) => ({
    ...task,
    callPoints: task.callPoints.map((point) => ({
      ...point,
      convertedTaskId:
        point.convertedTaskId !== null &&
        point.convertedTaskId !== task.id &&
        taskIds.has(point.convertedTaskId)
          ? point.convertedTaskId
          : null,
    })),
  }))
}

export function repairCallPointsForTask(
  callPoints: readonly CallPoint[],
  ownerTaskId: string,
  tasks: readonly Pick<Task, 'id'>[],
): CallPoint[] {
  const taskIds = new Set(tasks.map((task) => task.id))
  return callPoints.map((point) => ({
    ...point,
    convertedTaskId:
      point.convertedTaskId !== null &&
      point.convertedTaskId !== ownerTaskId &&
      taskIds.has(point.convertedTaskId)
        ? point.convertedTaskId
        : null,
  }))
}
