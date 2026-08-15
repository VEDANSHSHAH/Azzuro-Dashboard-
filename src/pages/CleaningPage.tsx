import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { format } from 'date-fns'
import {
  Bath,
  CalendarClock,
  Check,
  Edit3,
  KeyRound,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  PropertyBadge,
  SegmentedControl,
  SelectField,
  TextareaField,
  TextField,
} from '../components'
import {
  BATHROOM_CLEANING_STATE_OPTIONS,
  CLEANING_STATUS_OPTIONS,
  fromISODate,
  PROPERTY_OPTIONS,
  type BathroomCleaningEntry,
  type BathroomCleaningState,
  type CleaningEntry,
  type CleaningStatus,
  type GokiLockEntry,
  type Property,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import { propertyLabel } from '../features/work-items'

type CleaningView = 'logs' | 'bathrooms' | 'locks'

const registerOptions = [
  { value: 'logs', label: 'Cleaning log', icon: Sparkles },
  { value: 'bathrooms', label: 'Bathrooms', icon: Bath },
  { value: 'locks', label: 'Goki locks', icon: KeyRound },
] as const

const propertyChoices = PROPERTY_OPTIONS.filter((option) => option.value !== 'all')
const lockChangedOptions = [
  { value: 'not-changed', label: 'Not changed' },
  { value: 'changed', label: 'Changed' },
] as const

interface CleaningPageProps {
  workspace: WorkspaceApi
  query: string
}

function includesSearch(query: string, ...values: string[]): boolean {
  const search = query.trim().toLocaleLowerCase()
  return !search || values.join(' ').toLocaleLowerCase().includes(search)
}

function bathroomStateLabel(state: BathroomCleaningState): string {
  return BATHROOM_CLEANING_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state
}

function DateValue({ value, empty = 'Not recorded' }: { value: string | null; empty?: string }) {
  return <span>{value ? format(fromISODate(value), 'd MMM yyyy') : empty}</span>
}

export function CleaningPage({ workspace, query }: CleaningPageProps) {
  const [view, setView] = useState<CleaningView>('logs')
  const [cleaningEditorOpen, setCleaningEditorOpen] = useState(false)
  const [bathroomEditorOpen, setBathroomEditorOpen] = useState(false)
  const [lockEditorOpen, setLockEditorOpen] = useState(false)
  const [editingCleaning, setEditingCleaning] = useState<CleaningEntry | null>(null)
  const [editingBathroom, setEditingBathroom] = useState<BathroomCleaningEntry | null>(null)
  const [editingLock, setEditingLock] = useState<GokiLockEntry | null>(null)

  const cleaningEntries = useMemo(
    () => workspace.data.cleaningEntries.filter((entry) =>
      includesSearch(query, entry.title, entry.notes, propertyLabel(entry.property))),
    [query, workspace.data.cleaningEntries],
  )
  const bathrooms = useMemo(
    () => workspace.data.bathroomCleaningEntries.filter((entry) =>
      includesSearch(query, entry.bathroomName, entry.cleanerName, entry.notes, propertyLabel(entry.property))),
    [query, workspace.data.bathroomCleaningEntries],
  )
  const locks = useMemo(
    () => workspace.data.gokiLockEntries.filter((entry) =>
      includesSearch(query, entry.roomName, entry.notes, propertyLabel(entry.property))),
    [query, workspace.data.gokiLockEntries],
  )

  const addLabel = view === 'logs'
    ? 'Add cleaning note'
    : view === 'bathrooms'
      ? 'Add bathroom'
      : 'Add Goki lock'
  const addIcon = view === 'bathrooms' ? Bath : view === 'locks' ? KeyRound : Plus

  function openNew() {
    if (view === 'logs') {
      setEditingCleaning(null)
      setCleaningEditorOpen(true)
    } else if (view === 'bathrooms') {
      setEditingBathroom(null)
      setBathroomEditorOpen(true)
    } else {
      setEditingLock(null)
      setLockEditorOpen(true)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Property operations"
        title="Cleaning registers"
        description={<p>Keep the regular cleaning log, deep-clean every bathroom by property, and maintain Goki lock changes room by room.</p>}
        actions={<Button leadingIcon={addIcon} onClick={openNew}>{addLabel}</Button>}
      />

      <div className="cleaning-tabs">
        <SegmentedControl
          label="Choose cleaning register"
          value={view}
          options={registerOptions}
          onChange={setView}
        />
      </div>

      {view === 'logs' ? (
        <CleaningLogs
          entries={cleaningEntries}
          today={workspace.today}
          query={query}
          onNew={openNew}
          onEdit={(entry) => {
            setEditingCleaning(entry)
            setCleaningEditorOpen(true)
          }}
          onDelete={workspace.deleteCleaningEntry}
        />
      ) : null}
      {view === 'bathrooms' ? (
        <BathroomRegister
          entries={bathrooms}
          query={query}
          onNew={openNew}
          onEdit={(entry) => {
            setEditingBathroom(entry)
            setBathroomEditorOpen(true)
          }}
          onDelete={workspace.deleteBathroomCleaningEntry}
        />
      ) : null}
      {view === 'locks' ? (
        <GokiLockRegister
          entries={locks}
          query={query}
          onNew={openNew}
          onEdit={(entry) => {
            setEditingLock(entry)
            setLockEditorOpen(true)
          }}
          onDelete={workspace.deleteGokiLockEntry}
        />
      ) : null}

      <CleaningEditorModal
        open={cleaningEditorOpen}
        entry={editingCleaning}
        onClose={() => setCleaningEditorOpen(false)}
        onSave={(values) => {
          if (editingCleaning) workspace.updateCleaningEntry(editingCleaning.id, values)
          else workspace.addCleaningEntry(values)
        }}
      />
      <BathroomEditorModal
        open={bathroomEditorOpen}
        entry={editingBathroom}
        onClose={() => setBathroomEditorOpen(false)}
        onSave={(values) => {
          if (editingBathroom) workspace.updateBathroomCleaningEntry(editingBathroom.id, values)
          else workspace.addBathroomCleaningEntry(values)
        }}
      />
      <GokiLockEditorModal
        open={lockEditorOpen}
        entry={editingLock}
        onClose={() => setLockEditorOpen(false)}
        onSave={(values) => {
          if (editingLock) workspace.updateGokiLockEntry(editingLock.id, values)
          else workspace.addGokiLockEntry(values)
        }}
      />
    </div>
  )
}

function CleaningLogs({
  entries,
  today,
  query,
  onNew,
  onEdit,
  onDelete,
}: {
  entries: CleaningEntry[]
  today: string
  query: string
  onNew: () => void
  onEdit: (entry: CleaningEntry) => void
  onDelete: (id: string) => void
}) {
  if (!entries.length) {
    return (
      <div className="section-card">
        <EmptyState
          icon={Sparkles}
          title={query ? 'No matching cleaning notes' : 'Start your cleaning record'}
          description={query ? 'Try a different search phrase.' : 'Add the most recent clean and the next planned date for any property.'}
          action={!query ? <Button leadingIcon={Plus} onClick={onNew}>Add first log</Button> : undefined}
        />
      </div>
    )
  }

  return (
    <div className="cleaning-grid">
      {entries.map((entry) => {
        const isPastDue = entry.nextCleaningDate && entry.nextCleaningDate < today && entry.status !== 'completed'
        const displayedStatus: CleaningStatus = isPastDue ? 'overdue' : entry.status
        return (
          <article className="cleaning-card" key={entry.id}>
            <div className="cleaning-card__header">
              <div>
                <PropertyBadge property={propertyLabel(entry.property)} size="sm" />
                <h2 className="cleaning-card__property">{entry.title || propertyLabel(entry.property)}</h2>
              </div>
              <span className={`status-badge status-badge--${displayedStatus}`}>{displayedStatus}</span>
            </div>
            <div className="cleaning-card__dates">
              <div><span className="cleaning-card__date-label">Last cleaned</span><span className="cleaning-card__date-value"><DateValue value={entry.lastCleanedDate} /></span></div>
              <div><span className="cleaning-card__date-label">Next clean</span><span className="cleaning-card__date-value"><DateValue value={entry.nextCleaningDate} empty="Not scheduled" /></span></div>
            </div>
            <p className="cleaning-card__notes">{entry.notes || 'No cleaning notes yet.'}</p>
            <div className="cleaning-card__actions">
              <Button size="sm" variant="secondary" leadingIcon={Edit3} onClick={() => onEdit(entry)}>Edit log</Button>
              <IconButton label="Delete cleaning log" icon={Trash2} variant="danger" size="sm" onClick={() => { if (window.confirm('Delete this cleaning log?')) onDelete(entry.id) }} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function BathroomRegister({
  entries,
  query,
  onNew,
  onEdit,
  onDelete,
}: {
  entries: BathroomCleaningEntry[]
  query: string
  onNew: () => void
  onEdit: (entry: BathroomCleaningEntry) => void
  onDelete: (id: string) => void
}) {
  return (
    <RegisterLayout
      icon={Bath}
      title={query ? 'No matching bathrooms' : 'Build your bathroom register'}
      description={query ? 'Try another search phrase.' : 'Add every bathroom or ensuite and track deep cleaning, cleaner, and date.'}
      onNew={onNew}
      newLabel="Add bathroom"
      entries={entries}
      renderGroup={(_property, propertyEntries) => (
        <div className="register-list">
          {propertyEntries.map((entry) => (
            <article className="register-row" key={entry.id}>
              <div className="register-row__main">
                <strong>{entry.bathroomName || 'Unnamed bathroom'}</strong>
                <p>{entry.notes || 'No extra notes.'}</p>
              </div>
              <span className={`register-state register-state--${entry.deepCleaningState}`}>{bathroomStateLabel(entry.deepCleaningState)}</span>
              <div className="register-row__detail"><small>Deep cleaning date</small><DateValue value={entry.cleaningDate} /></div>
              <div className="register-row__detail"><small>Cleaner</small><span>{entry.cleanerName || 'Not recorded'}</span></div>
              <div className="register-row__actions">
                <IconButton label={`Edit ${entry.bathroomName || 'bathroom'}`} icon={Edit3} variant="quiet" size="sm" onClick={() => onEdit(entry)} />
                <IconButton label={`Delete ${entry.bathroomName || 'bathroom'}`} icon={Trash2} variant="danger" size="sm" onClick={() => { if (window.confirm('Delete this bathroom from the register?')) onDelete(entry.id) }} />
              </div>
            </article>
          ))}
        </div>
      )}
    />
  )
}

function GokiLockRegister({
  entries,
  query,
  onNew,
  onEdit,
  onDelete,
}: {
  entries: GokiLockEntry[]
  query: string
  onNew: () => void
  onEdit: (entry: GokiLockEntry) => void
  onDelete: (id: string) => void
}) {
  return (
    <RegisterLayout
      icon={KeyRound}
      title={query ? 'No matching Goki locks' : 'Build your Goki lock register'}
      description={query ? 'Try another search phrase.' : 'Add rooms to record whether the Goki lock has been changed and when.'}
      onNew={onNew}
      newLabel="Add Goki lock"
      entries={entries}
      renderGroup={(property, propertyEntries) => (
        <div className="register-list">
          {propertyEntries.map((entry) => (
            <article className="register-row" key={entry.id}>
              <div className="register-row__main">
                <strong>{entry.roomName || 'Unnamed room'}</strong>
                <p>{entry.notes || 'No lock notes.'}</p>
              </div>
              <span className={`register-state ${entry.lockChanged ? 'register-state--changed' : 'register-state--not-changed'}`}>
                {entry.lockChanged ? <Check aria-hidden="true" /> : null}
                {entry.lockChanged ? 'Changed' : 'Not changed'}
              </span>
              <div className="register-row__detail"><small>Changed date</small><DateValue value={entry.changedDate} /></div>
              <div className="register-row__detail"><small>Property</small><span>{propertyLabel(property)}</span></div>
              <div className="register-row__actions">
                <IconButton label={`Edit ${entry.roomName || 'room'} lock`} icon={Edit3} variant="quiet" size="sm" onClick={() => onEdit(entry)} />
                <IconButton label={`Delete ${entry.roomName || 'room'} lock`} icon={Trash2} variant="danger" size="sm" onClick={() => { if (window.confirm('Delete this Goki lock from the register?')) onDelete(entry.id) }} />
              </div>
            </article>
          ))}
        </div>
      )}
    />
  )
}

function RegisterLayout<T extends { property: Property }>({
  icon: Icon,
  title,
  description,
  onNew,
  newLabel,
  entries,
  renderGroup,
}: {
  icon: typeof Bath
  title: string
  description: string
  onNew: () => void
  newLabel: string
  entries: T[]
  renderGroup: (property: Property, entries: T[]) => ReactNode
}) {
  const groupedEntries = PROPERTY_OPTIONS
    .filter((option) => option.value !== 'all')
    .map((option) => ({
      property: option.value,
      entries: entries.filter((entry) => entry.property === option.value),
    }))
    .filter((group) => group.entries.length)

  return groupedEntries.length ? (
    <div className="register-groups">
      {groupedEntries.map((group) => (
        <section className="section-card register-group" key={group.property}>
          <div className="section-card__header">
            <div className="section-card__heading">
              <Icon aria-hidden="true" />
              <h2 className="section-card__title">{propertyLabel(group.property)}</h2>
              <span className="section-card__count">{group.entries.length}</span>
            </div>
            <PropertyBadge property={propertyLabel(group.property)} size="sm" />
          </div>
          <div className="section-card__body">{renderGroup(group.property, group.entries)}</div>
        </section>
      ))}
    </div>
  ) : (
    <div className="section-card">
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        action={<Button leadingIcon={Plus} onClick={onNew}>{newLabel}</Button>}
      />
    </div>
  )
}

interface CleaningValues {
  title: string
  property: Property
  lastCleanedDate: string | null
  nextCleaningDate: string | null
  notes: string
  status: CleaningStatus
}

function CleaningEditorModal({ open, entry, onClose, onSave }: { open: boolean; entry: CleaningEntry | null; onClose: () => void; onSave: (values: CleaningValues) => void }) {
  const [title, setTitle] = useState('')
  const [property, setProperty] = useState<Property>('pyrmont')
  const [lastCleanedDate, setLastCleanedDate] = useState('')
  const [nextCleaningDate, setNextCleaningDate] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CleaningStatus>('scheduled')
  useEffect(() => {
    if (!open) return
    setTitle(entry?.title ?? '')
    setProperty(entry?.property ?? 'pyrmont')
    setLastCleanedDate(entry?.lastCleanedDate ?? '')
    setNextCleaningDate(entry?.nextCleaningDate ?? '')
    setNotes(entry?.notes ?? '')
    setStatus(entry?.status ?? 'scheduled')
  }, [entry, open])
  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit cleaning log' : 'New cleaning log'} description="Keep this practical—what happened, what matters, and what comes next." footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button type="submit" form="cleaning-form" leadingIcon={CalendarClock}>Save log</Button></>}>
      <form id="cleaning-form" className="form-grid" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave({ title: title.trim(), property, lastCleanedDate: lastCleanedDate || null, nextCleaningDate: nextCleaningDate || null, notes, status }); onClose() }}>
        <TextField label="Log name" placeholder="e.g. Post-checkout clean" value={title} fieldClassName="form-grid__full" autoFocus onChange={(event) => setTitle(event.target.value)} />
        <SelectField label="Property" value={property} options={propertyChoices} onChange={(event) => setProperty(event.target.value as Property)} />
        <SelectField label="Status" value={status} options={CLEANING_STATUS_OPTIONS} onChange={(event) => setStatus(event.target.value as CleaningStatus)} />
        <TextField label="Last cleaned" type="date" value={lastCleanedDate} onChange={(event) => setLastCleanedDate(event.target.value)} />
        <TextField label="Next cleaning" type="date" value={nextCleaningDate} onChange={(event) => setNextCleaningDate(event.target.value)} />
        <TextareaField label="Cleaning notes" placeholder="Condition, supplies, issues, access details…" value={notes} rows={7} fieldClassName="form-grid__full" onChange={(event) => setNotes(event.target.value)} />
      </form>
    </Modal>
  )
}

function BathroomEditorModal({ open, entry, onClose, onSave }: { open: boolean; entry: BathroomCleaningEntry | null; onClose: () => void; onSave: (values: { property: Property; bathroomName: string; deepCleaningState: BathroomCleaningState; cleaningDate: string | null; cleanerName: string; notes: string }) => void }) {
  const [bathroomName, setBathroomName] = useState('')
  const [property, setProperty] = useState<Property>('allen')
  const [deepCleaningState, setDeepCleaningState] = useState<BathroomCleaningState>('not-deep-cleaned')
  const [cleaningDate, setCleaningDate] = useState('')
  const [cleanerName, setCleanerName] = useState('')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (!open) return
    setBathroomName(entry?.bathroomName ?? '')
    setProperty(entry?.property ?? 'allen')
    setDeepCleaningState(entry?.deepCleaningState ?? 'not-deep-cleaned')
    setCleaningDate(entry?.cleaningDate ?? '')
    setCleanerName(entry?.cleanerName ?? '')
    setNotes(entry?.notes ?? '')
  }, [entry, open])
  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit bathroom' : 'Add bathroom'} description="Track every bathroom or ensuite and its latest deep cleaning." footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button type="submit" form="bathroom-form" leadingIcon={Bath}>Save bathroom</Button></>}>
      <form id="bathroom-form" className="form-grid" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave({ property, bathroomName: bathroomName.trim(), deepCleaningState, cleaningDate: cleaningDate || null, cleanerName: cleanerName.trim(), notes: notes.trim() }); onClose() }}>
        <TextField label="Bathroom / ensuite" placeholder="e.g. Allen 13 or Ensuite Allen 3" value={bathroomName} required autoFocus fieldClassName="form-grid__full" onChange={(event) => setBathroomName(event.target.value)} />
        <SelectField label="Property" value={property} options={propertyChoices} onChange={(event) => setProperty(event.target.value as Property)} />
        <SelectField label="Deep cleaned?" value={deepCleaningState} options={BATHROOM_CLEANING_STATE_OPTIONS} onChange={(event) => setDeepCleaningState(event.target.value as BathroomCleaningState)} />
        <TextField label="Deep cleaning date" type="date" value={cleaningDate} onChange={(event) => setCleaningDate(event.target.value)} />
        <TextField label="Cleaner name" placeholder="e.g. Sobit" value={cleanerName} onChange={(event) => setCleanerName(event.target.value)} />
        <TextareaField label="Notes" placeholder="Access, repairs, condition, or any important detail…" value={notes} rows={5} fieldClassName="form-grid__full" onChange={(event) => setNotes(event.target.value)} />
      </form>
    </Modal>
  )
}

function GokiLockEditorModal({ open, entry, onClose, onSave }: { open: boolean; entry: GokiLockEntry | null; onClose: () => void; onSave: (values: { property: Property; roomName: string; lockChanged: boolean; changedDate: string | null; notes: string }) => void }) {
  const [roomName, setRoomName] = useState('')
  const [property, setProperty] = useState<Property>('allen')
  const [lockChanged, setLockChanged] = useState(false)
  const [changedDate, setChangedDate] = useState('')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (!open) return
    setRoomName(entry?.roomName ?? '')
    setProperty(entry?.property ?? 'allen')
    setLockChanged(entry?.lockChanged ?? false)
    setChangedDate(entry?.changedDate ?? '')
    setNotes(entry?.notes ?? '')
  }, [entry, open])
  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit Goki lock' : 'Add Goki lock'} description="Maintain each room’s Goki lock replacement history." footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button type="submit" form="goki-lock-form" leadingIcon={KeyRound}>Save lock</Button></>}>
      <form id="goki-lock-form" className="form-grid" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave({ property, roomName: roomName.trim(), lockChanged, changedDate: changedDate || null, notes: notes.trim() }); onClose() }}>
        <TextField label="Room" placeholder="e.g. Room 302" value={roomName} required autoFocus fieldClassName="form-grid__full" onChange={(event) => setRoomName(event.target.value)} />
        <SelectField label="Property" value={property} options={propertyChoices} onChange={(event) => setProperty(event.target.value as Property)} />
        <SelectField label="Goki lock changed?" value={lockChanged ? 'changed' : 'not-changed'} options={lockChangedOptions} onChange={(event) => setLockChanged(event.target.value === 'changed')} />
        <TextField label="Changed date" type="date" value={changedDate} onChange={(event) => setChangedDate(event.target.value)} />
        <TextareaField label="Notes" placeholder="Lock type, code handover, issue, or other useful detail…" value={notes} rows={5} fieldClassName="form-grid__full" onChange={(event) => setNotes(event.target.value)} />
      </form>
    </Modal>
  )
}
