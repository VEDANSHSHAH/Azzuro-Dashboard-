import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEmptyAppData, createId } from '../data/defaults'
import { addDays, isISODate, normalizeISODate, toISODate } from '../domain/dates'
import {
  normalizeCallPoints,
  normalizeTaskKind,
  normalizeTaskStatusForKind,
  repairCallPointsForTask,
} from '../domain/calls'
import { isReminderForDate } from '../domain/reminders'
import { normalizeTaskParentId } from '../domain/taskChains'
import type {
  AppData,
  CleaningEntry,
  CreateCleaningEntryInput,
  CreateLinkInput,
  CreateNoteInput,
  CreateReminderInput,
  CreateRuleNoteInput,
  CreateTaskInput,
  ISODate,
  LinkEntry,
  Note,
  Reminder,
  RuleNote,
  Task,
  TaskStatus,
  UpdateCleaningEntryInput,
  UpdateLinkInput,
  UpdateNoteInput,
  UpdateReminderInput,
  UpdateRuleNoteInput,
  UpdateTaskInput,
} from '../domain/models'
import {
  isSupabaseConfigured,
  loadCloudWorkspace,
  loadLegacyWorkspace,
  saveCloudWorkspace,
  saveLinkSecrets,
  supabase,
} from '../supabase'

export type SaveState = 'saved' | 'saving' | 'error'
export type WorkspaceAccessState = 'loading' | 'signed-out' | 'ready' | 'error'

export interface UseWorkspaceOptions {
  /** Delay between the last edit and local persistence. Defaults to 450ms. */
  saveDelay?: number
}

export interface WorkspaceApi {
  data: AppData
  accessState: WorkspaceAccessState
  authError: string | null
  userEmail: string | null
  selectedDate: ISODate
  today: ISODate
  isToday: boolean
  selectedNotes: Note[]
  selectedTasks: Task[]
  selectedReminders: Reminder[]
  todayNotes: Note[]
  todayTasks: Task[]
  todayReminders: Reminder[]
  saveState: SaveState
  lastSavedAt: string | null
  setSelectedDate: (date: ISODate) => void
  selectDate: (date: ISODate) => void
  goToToday: () => void
  goToPreviousDay: () => void
  goToNextDay: () => void
  getNotesForDate: (date: ISODate) => Note[]
  getTasksForDate: (date: ISODate) => Task[]
  getFollowUpTasks: (parentTaskId: string) => Task[]
  getParentTask: (taskId: string) => Task | null
  getConvertedTaskForCallPoint: (
    callTaskId: string,
    pointId: string,
  ) => Task | null
  getRemindersForDate: (date: ISODate) => Reminder[]
  addNote: (input?: CreateNoteInput) => Note
  updateNote: (id: string, patch: UpdateNoteInput) => void
  deleteNote: (id: string) => void
  addTask: (input?: CreateTaskInput) => Task
  addLinkedTask: (parentTaskId: string, input?: CreateTaskInput) => Task
  convertCallPointToTask: (
    callTaskId: string,
    pointId: string,
    input?: CreateTaskInput,
  ) => Task
  updateTask: (id: string, patch: UpdateTaskInput) => void
  deleteTask: (id: string) => void
  shiftTask: (id: string, date: ISODate) => void
  changeTaskStatus: (id: string, status: TaskStatus) => void
  addReminder: (input?: CreateReminderInput) => Reminder
  updateReminder: (id: string, patch: UpdateReminderInput) => void
  deleteReminder: (id: string) => void
  addCleaningEntry: (input?: CreateCleaningEntryInput) => CleaningEntry
  updateCleaningEntry: (id: string, patch: UpdateCleaningEntryInput) => void
  deleteCleaningEntry: (id: string) => void
  addRuleNote: (input?: CreateRuleNoteInput) => RuleNote
  updateRuleNote: (id: string, patch: UpdateRuleNoteInput) => void
  deleteRuleNote: (id: string) => void
  addLink: (input?: CreateLinkInput) => LinkEntry
  updateLink: (id: string, patch: UpdateLinkInput) => void
  deleteLink: (id: string) => void
  resetWorkspace: () => void
  flush: () => boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const DEFAULT_SAVE_DELAY = 450

function timestamp(): string {
  return new Date().toISOString()
}

function nullableDate(value: ISODate | null): ISODate | null {
  return value !== null && isISODate(value) ? value : null
}

export function useWorkspace(options: UseWorkspaceOptions = {}): WorkspaceApi {
  const saveDelay = Math.max(0, options.saveDelay ?? DEFAULT_SAVE_DELAY)
  const [data, setData] = useState<AppData>(createEmptyAppData)
  const [accessState, setAccessState] = useState<WorkspaceAccessState>(
    isSupabaseConfigured ? 'loading' : 'error',
  )
  const [authError, setAuthError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : 'This MYWORK AZZURO build is missing its Supabase connection settings.',
  )
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedDate, setSelectedDateState] = useState<ISODate>(toISODate)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const dataRef = useRef(data)
  const firstPersistencePass = useRef(true)
  const revisionRef = useRef<number | null>(null)
  const nativeSecretIds = useRef<Set<string>>(new Set())
  const activeUserId = useRef<string | null | undefined>(undefined)
  const legacyImported = useRef(false)
  dataRef.current = data

  const today = toISODate()

  const updateData = useCallback(
    (recipe: (current: AppData) => AppData): void => {
      const next = recipe(dataRef.current)
      if (next === dataRef.current) return

      const stamped = { ...next, updatedAt: timestamp() }
      dataRef.current = stamped
      setSaveState('saving')
      setData(stamped)
    },
    [],
  )

  const persistData = useCallback(
    async (workspaceData: AppData): Promise<boolean> => {
      try {
        const currentIds = await saveLinkSecrets(
          workspaceData.links,
          nativeSecretIds.current,
        )
        const saved = await saveCloudWorkspace(workspaceData, revisionRef.current)
        nativeSecretIds.current = currentIds
        revisionRef.current = saved.revision
        return true
      } catch {
        return false
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    if (!supabase) return () => { cancelled = true }

    async function hydrateWorkspace(): Promise<void> {
      try {
        const cloudWorkspace = await loadCloudWorkspace()
        if (cancelled) return

        if (cloudWorkspace) {
          firstPersistencePass.current = true
          nativeSecretIds.current = new Set(
            cloudWorkspace.data.links.map((link) => link.id),
          )
          revisionRef.current = cloudWorkspace.revision
          dataRef.current = cloudWorkspace.data
          setData(cloudWorkspace.data)
          setSaveState('saved')
          setLastSavedAt(cloudWorkspace.data.updatedAt)
          setAccessState('ready')
          return
        }

        const initialData = legacyImported.current
          ? createEmptyAppData()
          : await loadLegacyWorkspace()
        if (cancelled) return

        const createdWorkspace = await saveCloudWorkspace(initialData, null)
        if (cancelled) return

        legacyImported.current = true
        firstPersistencePass.current = true
        nativeSecretIds.current = new Set(initialData.links.map((link) => link.id))
        revisionRef.current = createdWorkspace.revision
        dataRef.current = initialData
        setData(initialData)
        setSaveState('saved')
        setLastSavedAt(createdWorkspace.data.updatedAt)
        setAccessState('ready')
      } catch (error) {
        if (cancelled) return
        setAuthError(error instanceof Error ? error.message : 'Could not load your cloud workspace.')
        setAccessState('error')
      }
    }

    function applySession(userId: string | null, email: string | null): void {
      if (activeUserId.current === userId) return

      activeUserId.current = userId
      firstPersistencePass.current = true
      revisionRef.current = null
      setUserEmail(email)
      setAuthError(null)

      if (!userId) {
        dataRef.current = createEmptyAppData()
        setData(dataRef.current)
        setAccessState('signed-out')
        setSaveState('saved')
        return
      }

      setAccessState('loading')
      void hydrateWorkspace()
    }

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled) return
      if (error) {
        setAuthError(error.message)
        setAccessState('error')
        return
      }
      applySession(session?.user.id ?? null, session?.user.email ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      applySession(session?.user.id ?? null, session?.user.email ?? null)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (accessState !== 'ready') return
    if (firstPersistencePass.current) {
      firstPersistencePass.current = false
      return
    }

    const timer = window.setTimeout(() => {
      void persistData(data).then((saved) => {
        if (saved) {
          setSaveState('saved')
          setLastSavedAt(timestamp())
        } else {
          setSaveState('error')
        }
      })
    }, saveDelay)

    return () => window.clearTimeout(timer)
  }, [accessState, data, persistData, saveDelay])

  useEffect(() => {
    const saveLatestData = (): void => {
      if (accessState !== 'ready') return
      void persistData(dataRef.current)
    }

    window.addEventListener('pagehide', saveLatestData)
    return () => {
      window.removeEventListener('pagehide', saveLatestData)
      saveLatestData()
    }
  }, [accessState, persistData])

  const selectDate = useCallback((date: ISODate): void => {
    setSelectedDateState(normalizeISODate(date))
  }, [])

  const goToToday = useCallback((): void => {
    setSelectedDateState(toISODate())
  }, [])

  const goToPreviousDay = useCallback((): void => {
    setSelectedDateState((current) => addDays(current, -1))
  }, [])

  const goToNextDay = useCallback((): void => {
    setSelectedDateState((current) => addDays(current, 1))
  }, [])

  const getNotesForDate = useCallback(
    (date: ISODate): Note[] => data.notes.filter((note) => note.date === date),
    [data.notes],
  )

  const getTasksForDate = useCallback(
    (date: ISODate): Task[] => data.tasks.filter((task) => task.date === date),
    [data.tasks],
  )

  const getFollowUpTasks = useCallback(
    (parentTaskId: string): Task[] =>
      data.tasks.filter((task) => task.parentTaskId === parentTaskId),
    [data.tasks],
  )

  const getParentTask = useCallback(
    (taskId: string): Task | null => {
      const task = data.tasks.find((candidate) => candidate.id === taskId)
      if (!task?.parentTaskId) return null
      return data.tasks.find((candidate) => candidate.id === task.parentTaskId) ?? null
    },
    [data.tasks],
  )

  const getConvertedTaskForCallPoint = useCallback(
    (callTaskId: string, pointId: string): Task | null => {
      const call = data.tasks.find(
        (task) => task.id === callTaskId && task.kind === 'call',
      )
      const convertedTaskId = call?.callPoints.find(
        (point) => point.id === pointId,
      )?.convertedTaskId

      if (!convertedTaskId) return null
      return data.tasks.find((task) => task.id === convertedTaskId) ?? null
    },
    [data.tasks],
  )

  const getRemindersForDate = useCallback(
    (date: ISODate): Reminder[] =>
      data.reminders.filter((reminder) => isReminderForDate(reminder, date)),
    [data.reminders],
  )

  const selectedNotes = useMemo(
    () => data.notes.filter((note) => note.date === selectedDate),
    [data.notes, selectedDate],
  )

  const selectedTasks = useMemo(
    () => data.tasks.filter((task) => task.date === selectedDate),
    [data.tasks, selectedDate],
  )

  const selectedReminders = useMemo(
    () =>
      data.reminders.filter((reminder) =>
        isReminderForDate(reminder, selectedDate),
      ),
    [data.reminders, selectedDate],
  )

  const todayNotes = useMemo(
    () => data.notes.filter((note) => note.date === today),
    [data.notes, today],
  )

  const todayTasks = useMemo(
    () => data.tasks.filter((task) => task.date === today),
    [data.tasks, today],
  )

  const todayReminders = useMemo(
    () =>
      data.reminders.filter((reminder) => isReminderForDate(reminder, today)),
    [data.reminders, today],
  )

  const addNote = useCallback(
    (input: CreateNoteInput = {}): Note => {
      const createdAt = timestamp()
      const note: Note = {
        id: createId('note'),
        date: normalizeISODate(input.date, selectedDate),
        title: input.title ?? '',
        content: input.content ?? '',
        pinned: input.pinned ?? false,
        createdAt,
        updatedAt: createdAt,
      }

      updateData((current) => ({
        ...current,
        notes: [note, ...current.notes],
      }))
      return note
    },
    [selectedDate, updateData],
  )

  const updateNote = useCallback(
    (id: string, patch: UpdateNoteInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        notes: current.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                ...patch,
                date:
                  patch.date === undefined
                    ? note.date
                    : normalizeISODate(patch.date, note.date),
                updatedAt,
              }
            : note,
        ),
      }))
    },
    [updateData],
  )

  const deleteNote = useCallback(
    (id: string): void => {
      updateData((current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== id),
      }))
    },
    [updateData],
  )

  const addTask = useCallback(
    (input: CreateTaskInput = {}): Task => {
      const createdAt = timestamp()
      const kind = normalizeTaskKind(input.kind)
      const status = normalizeTaskStatusForKind(
        kind,
        input.status ?? 'untouched',
      )
      const id = createId('task')
      const callPoints = repairCallPointsForTask(
        normalizeCallPoints(input.callPoints, id),
        id,
        [...dataRef.current.tasks, { id }],
      )
      const task: Task = {
        id,
        kind,
        date: normalizeISODate(input.date, selectedDate),
        title: input.title ?? '',
        description: input.description ?? '',
        findings: input.findings ?? '',
        callOutcome: input.callOutcome ?? '',
        callPoints,
        property: input.property ?? 'all',
        status,
        assignedTo: input.assignedTo ?? '',
        parentTaskId: normalizeTaskParentId(
          input.parentTaskId,
          id,
          dataRef.current.tasks,
        ),
        createdAt,
        updatedAt: createdAt,
        completedAt: status === 'done' ? createdAt : null,
      }

      updateData((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
      }))
      return task
    },
    [selectedDate, updateData],
  )

  const addLinkedTask = useCallback(
    (parentTaskId: string, input: CreateTaskInput = {}): Task => {
      if (!dataRef.current.tasks.some((task) => task.id === parentTaskId)) {
        throw new Error('Cannot add a linked task: parent task does not exist.')
      }

      return addTask({ ...input, parentTaskId })
    },
    [addTask],
  )

  const convertCallPointToTask = useCallback(
    (
      callTaskId: string,
      pointId: string,
      input: CreateTaskInput = {},
    ): Task => {
      const currentTasks = dataRef.current.tasks
      const call = currentTasks.find((task) => task.id === callTaskId)
      if (!call || call.kind !== 'call') {
        throw new Error('Cannot convert call point: call task does not exist.')
      }

      const point = call.callPoints.find((candidate) => candidate.id === pointId)
      if (!point) {
        throw new Error('Cannot convert call point: call point does not exist.')
      }

      if (point.convertedTaskId) {
        const existing = currentTasks.find(
          (task) => task.id === point.convertedTaskId,
        )
        if (existing) return existing
      }

      const createdAt = timestamp()
      const id = createId('task')
      const status = normalizeTaskStatusForKind(
        'task',
        input.status ?? 'scheduled',
      )
      const convertedTask: Task = {
        id,
        kind: 'task',
        date: normalizeISODate(input.date, call.date),
        title: input.title ?? point.text,
        description: input.description ?? '',
        findings: input.findings ?? '',
        callOutcome: '',
        callPoints: [],
        property: input.property ?? call.property,
        status,
        assignedTo: input.assignedTo ?? '',
        parentTaskId: normalizeTaskParentId(callTaskId, id, currentTasks),
        createdAt,
        updatedAt: createdAt,
        completedAt: status === 'done' ? createdAt : null,
      }

      updateData((current) => ({
        ...current,
        tasks: [
          convertedTask,
          ...current.tasks.map((task) =>
            task.id === callTaskId
              ? {
                  ...task,
                  callPoints: task.callPoints.map((callPoint) =>
                    callPoint.id === pointId
                      ? { ...callPoint, convertedTaskId: convertedTask.id }
                      : callPoint,
                  ),
                  updatedAt: createdAt,
                }
              : task,
          ),
        ],
      }))

      return convertedTask
    },
    [updateData],
  )

  const updateTask = useCallback(
    (id: string, patch: UpdateTaskInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== id) return task

          const nextKind = normalizeTaskKind(patch.kind ?? task.kind)
          const nextStatus = normalizeTaskStatusForKind(
            nextKind,
            patch.status ?? task.status,
          )
          const nextCallPoints =
            patch.callPoints === undefined
              ? task.callPoints
              : repairCallPointsForTask(
                  normalizeCallPoints(patch.callPoints, id),
                  id,
                  current.tasks,
                )
          return {
            ...task,
            ...patch,
            kind: nextKind,
            date:
              patch.date === undefined
                ? task.date
                : normalizeISODate(patch.date, task.date),
            status: nextStatus,
            assignedTo:
              typeof patch.assignedTo === 'string'
                ? patch.assignedTo
                : task.assignedTo,
            findings:
              typeof patch.findings === 'string' ? patch.findings : task.findings,
            callOutcome:
              typeof patch.callOutcome === 'string'
                ? patch.callOutcome
                : task.callOutcome,
            callPoints: nextCallPoints,
            parentTaskId:
              patch.parentTaskId === undefined
                ? task.parentTaskId
                : normalizeTaskParentId(patch.parentTaskId, id, current.tasks),
            completedAt:
              nextStatus === 'done'
                ? task.completedAt ?? updatedAt
                : null,
            updatedAt,
          }
        }),
      }))
    },
    [updateData],
  )

  const deleteTask = useCallback(
    (id: string): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        tasks: current.tasks
          .filter((task) => task.id !== id)
          .map((task) => {
            const shouldUnlinkParent = task.parentTaskId === id
            const callPoints = task.callPoints.map((point) =>
              point.convertedTaskId === id
                ? { ...point, convertedTaskId: null }
                : point,
            )
            const clearedConvertedReference = callPoints.some(
              (point, index) => point !== task.callPoints[index],
            )

            return shouldUnlinkParent || clearedConvertedReference
              ? {
                  ...task,
                  parentTaskId: shouldUnlinkParent ? null : task.parentTaskId,
                  callPoints,
                  updatedAt,
                }
              : task
          }),
      }))
    },
    [updateData],
  )

  const shiftTask = useCallback(
    (id: string, date: ISODate): void => {
      updateTask(id, { date: normalizeISODate(date) })
    },
    [updateTask],
  )

  const changeTaskStatus = useCallback(
    (id: string, status: TaskStatus): void => {
      updateTask(id, { status })
    },
    [updateTask],
  )

  const addReminder = useCallback(
    (input: CreateReminderInput = {}): Reminder => {
      const createdAt = timestamp()
      const scheduleMode = input.scheduleMode ?? 'specific'
      const reminder: Reminder = {
        id: createId('reminder'),
        title: input.title ?? '',
        content: input.content ?? '',
        scheduleMode,
        specificDate:
          input.specificDate === undefined
            ? scheduleMode === 'specific'
              ? selectedDate
              : null
            : nullableDate(input.specificDate),
        startDate: nullableDate(input.startDate ?? null),
        endDate: nullableDate(input.endDate ?? null),
        createdAt,
        updatedAt: createdAt,
      }

      updateData((current) => ({
        ...current,
        reminders: [reminder, ...current.reminders],
      }))
      return reminder
    },
    [selectedDate, updateData],
  )

  const updateReminder = useCallback(
    (id: string, patch: UpdateReminderInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        reminders: current.reminders.map((reminder) =>
          reminder.id === id
            ? {
                ...reminder,
                ...patch,
                title:
                  typeof patch.title === 'string' ? patch.title : reminder.title,
                content:
                  typeof patch.content === 'string'
                    ? patch.content
                    : reminder.content,
                scheduleMode: patch.scheduleMode ?? reminder.scheduleMode,
                specificDate:
                  patch.specificDate === undefined
                    ? reminder.specificDate
                    : nullableDate(patch.specificDate),
                startDate:
                  patch.startDate === undefined
                    ? reminder.startDate
                    : nullableDate(patch.startDate),
                endDate:
                  patch.endDate === undefined
                    ? reminder.endDate
                    : nullableDate(patch.endDate),
                updatedAt,
              }
            : reminder,
        ),
      }))
    },
    [updateData],
  )

  const deleteReminder = useCallback(
    (id: string): void => {
      updateData((current) => ({
        ...current,
        reminders: current.reminders.filter((reminder) => reminder.id !== id),
      }))
    },
    [updateData],
  )

  const addCleaningEntry = useCallback(
    (input: CreateCleaningEntryInput = {}): CleaningEntry => {
      const createdAt = timestamp()
      const entry: CleaningEntry = {
        id: createId('cleaning'),
        title: input.title ?? '',
        property: input.property ?? 'all',
        lastCleanedDate: nullableDate(input.lastCleanedDate ?? null),
        nextCleaningDate: nullableDate(input.nextCleaningDate ?? null),
        notes: input.notes ?? '',
        status: input.status ?? 'scheduled',
        createdAt,
        updatedAt: createdAt,
      }

      updateData((current) => ({
        ...current,
        cleaningEntries: [entry, ...current.cleaningEntries],
      }))
      return entry
    },
    [updateData],
  )

  const updateCleaningEntry = useCallback(
    (id: string, patch: UpdateCleaningEntryInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        cleaningEntries: current.cleaningEntries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...patch,
                lastCleanedDate:
                  patch.lastCleanedDate === undefined
                    ? entry.lastCleanedDate
                    : nullableDate(patch.lastCleanedDate),
                nextCleaningDate:
                  patch.nextCleaningDate === undefined
                    ? entry.nextCleaningDate
                    : nullableDate(patch.nextCleaningDate),
                updatedAt,
              }
            : entry,
        ),
      }))
    },
    [updateData],
  )

  const deleteCleaningEntry = useCallback(
    (id: string): void => {
      updateData((current) => ({
        ...current,
        cleaningEntries: current.cleaningEntries.filter((entry) => entry.id !== id),
      }))
    },
    [updateData],
  )

  const addRuleNote = useCallback(
    (input: CreateRuleNoteInput = {}): RuleNote => {
      const createdAt = timestamp()
      const rule: RuleNote = {
        id: createId('rule'),
        title: input.title ?? '',
        content: input.content ?? '',
        category: input.category ?? '',
        pinned: input.pinned ?? false,
        createdAt,
        updatedAt: createdAt,
      }

      updateData((current) => ({
        ...current,
        ruleNotes: [rule, ...current.ruleNotes],
      }))
      return rule
    },
    [updateData],
  )

  const updateRuleNote = useCallback(
    (id: string, patch: UpdateRuleNoteInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        ruleNotes: current.ruleNotes.map((rule) =>
          rule.id === id ? { ...rule, ...patch, updatedAt } : rule,
        ),
      }))
    },
    [updateData],
  )

  const deleteRuleNote = useCallback(
    (id: string): void => {
      updateData((current) => ({
        ...current,
        ruleNotes: current.ruleNotes.filter((rule) => rule.id !== id),
      }))
    },
    [updateData],
  )

  const addLink = useCallback(
    (input: CreateLinkInput = {}): LinkEntry => {
      const createdAt = timestamp()
      const link: LinkEntry = {
        id: createId('link'),
        name: input.name ?? '',
        url: input.url ?? '',
        username: input.username ?? '',
        password: input.password ?? '',
        notes: input.notes ?? '',
        property: input.property ?? 'all',
        createdAt,
        updatedAt: createdAt,
      }

      updateData((current) => ({
        ...current,
        links: [link, ...current.links],
      }))
      return link
    },
    [updateData],
  )

  const updateLink = useCallback(
    (id: string, patch: UpdateLinkInput): void => {
      const updatedAt = timestamp()
      updateData((current) => ({
        ...current,
        links: current.links.map((link) =>
          link.id === id ? { ...link, ...patch, updatedAt } : link,
        ),
      }))
    },
    [updateData],
  )

  const deleteLink = useCallback(
    (id: string): void => {
      updateData((current) => ({
        ...current,
        links: current.links.filter((link) => link.id !== id),
      }))
    },
    [updateData],
  )

  const resetWorkspace = useCallback((): void => {
    setSelectedDateState(toISODate())
    updateData(() => createEmptyAppData())
  }, [updateData])

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    if (!supabase) {
      setAuthError('This MYWORK AZZURO build is missing its Supabase connection settings.')
      setAccessState('error')
      return
    }

    setAuthError(null)
    setAccessState('loading')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      setAccessState('signed-out')
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    if (!supabase) {
      setAuthError('This MYWORK AZZURO build is missing its Supabase connection settings.')
      setAccessState('error')
      return
    }

    setAuthError(null)
    setAccessState('loading')
    const { data: signUpData, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setAuthError(error.message)
      setAccessState('signed-out')
      return
    }

    if (!signUpData.session) {
      setAuthError('Account created. Check your email to confirm it, then sign in here.')
      setAccessState('signed-out')
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return

    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(error.message)
      return
    }

    activeUserId.current = undefined
    setAuthError(null)
  }, [])

  const flush = useCallback((): boolean => {
    if (accessState !== 'ready') return false

    setSaveState('saving')
    void persistData(dataRef.current).then((saved) => {
      setSaveState(saved ? 'saved' : 'error')
      if (saved) setLastSavedAt(timestamp())
    })
    return true
  }, [accessState, persistData])

  return {
    data,
    accessState,
    authError,
    userEmail,
    selectedDate,
    today,
    isToday: selectedDate === today,
    selectedNotes,
    selectedTasks,
    selectedReminders,
    todayNotes,
    todayTasks,
    todayReminders,
    saveState,
    lastSavedAt,
    setSelectedDate: selectDate,
    selectDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    getNotesForDate,
    getTasksForDate,
    getFollowUpTasks,
    getParentTask,
    getConvertedTaskForCallPoint,
    getRemindersForDate,
    addNote,
    updateNote,
    deleteNote,
    addTask,
    addLinkedTask,
    convertCallPointToTask,
    updateTask,
    deleteTask,
    shiftTask,
    changeTaskStatus,
    addReminder,
    updateReminder,
    deleteReminder,
    addCleaningEntry,
    updateCleaningEntry,
    deleteCleaningEntry,
    addRuleNote,
    updateRuleNote,
    deleteRuleNote,
    addLink,
    updateLink,
    deleteLink,
    resetWorkspace,
    flush,
    signIn,
    signUp,
    signOut,
  }
}

export default useWorkspace
