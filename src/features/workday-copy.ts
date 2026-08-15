import { format } from 'date-fns'
import {
  PROPERTY_OPTIONS,
  TASK_STATUS_OPTIONS,
  fromISODate,
  type ISODate,
  type Note,
  type Task,
} from '../domain'

export interface WorkdayCopyData {
  date: ISODate
  notes: readonly Note[]
  tasks: readonly Task[]
  allTasks: readonly Task[]
}

function propertyLabel(value: Task['property']): string {
  return PROPERTY_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function statusLabel(value: Task['status']): string {
  return TASK_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function addMultilineField(lines: string[], label: string, value: string, indent = '   ') {
  const text = value.trim()
  if (!text) return

  const [firstLine, ...remainingLines] = text.split(/\r?\n/)
  lines.push(`${indent}${label}: ${firstLine}`)
  remainingLines.forEach((line) => lines.push(`${indent}${' '.repeat(label.length + 2)}${line}`))
}

/** Creates a paste-ready record of every note, task, and call visible for one day. */
export function formatWorkdayForClipboard({
  date,
  notes,
  tasks,
  allTasks,
}: WorkdayCopyData): string {
  const taskById = new Map(allTasks.map((task) => [task.id, task]))
  const lines = [
    `MYWORK AZZURO — ${format(fromISODate(date), 'EEEE, d MMMM yyyy')}`,
    '',
    `NOTES (${notes.length})`,
  ]

  if (notes.length === 0) {
    lines.push('None')
  } else {
    notes.forEach((note, index) => {
      lines.push(`${index + 1}. ${note.title.trim() || 'Untitled note'}${note.pinned ? ' [Pinned]' : ''}`)
      addMultilineField(lines, 'Note', note.content)
      lines.push('')
    })
    if (lines.at(-1) === '') lines.pop()
  }

  lines.push('', `TASKS & CALLS (${tasks.length})`)
  if (tasks.length === 0) {
    lines.push('None')
  } else {
    tasks.forEach((task, index) => {
      const kind = task.kind === 'call' ? 'CALL' : 'TASK'
      lines.push(`${index + 1}. [${kind} · ${statusLabel(task.status)}] ${task.title.trim() || `Untitled ${task.kind}`}`)
      lines.push(task.date
        ? `   Added on: ${format(fromISODate(task.date), 'd MMMM yyyy')}`
        : '   Added on: No day assigned')
      if (task.scheduledFor && task.scheduledFor !== task.date) {
        lines.push(`   Also scheduled for: ${format(fromISODate(task.scheduledFor), 'd MMMM yyyy')}`)
      }
      lines.push(`   Property: ${propertyLabel(task.property)}`)
      if (task.assignedTo.trim()) {
        lines.push(
          `   Assigned to: ${task.assignedTo.trim()} — ${task.assignmentState === 'given' ? 'Given' : 'Need to give'}`,
        )
      }
      if (task.parentTaskId) {
        const parent = taskById.get(task.parentTaskId)
        lines.push(`   Follow-up to: ${parent?.title.trim() || 'Linked task'}`)
      }
      addMultilineField(lines, task.kind === 'call' ? 'What to discuss' : 'Description', task.description)
      if (task.kind === 'call') {
        addMultilineField(lines, 'What I heard', task.callOutcome)
        if (task.callPoints.length) {
          lines.push('   Outcome points:')
          task.callPoints.forEach((point) => {
            const linkedTask = point.convertedTaskId
              ? taskById.get(point.convertedTaskId)
              : undefined
            lines.push(`   - ${point.text}${linkedTask ? ` → Task: ${linkedTask.title.trim() || 'Untitled task'}` : ''}`)
          })
        }
      } else {
        addMultilineField(lines, 'Task status', task.statusNote)
        addMultilineField(lines, 'Findings', task.findings)
      }
      lines.push('')
    })
    if (lines.at(-1) === '') lines.pop()
  }

  return lines.join('\n')
}

/** Copies text in both the desktop webview and a browser fallback. */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Some desktop webviews expose Clipboard but deny it; use the DOM fallback below.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Clipboard access was unavailable')
}
