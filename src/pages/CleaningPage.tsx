import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { format, subMonths } from 'date-fns'
import {
  Bath,
  Bug,
  CalendarClock,
  Check,
  Edit3,
  KeyRound,
  ListPlus,
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
  type PestSprayEntry,
  type PestSprayRoomInput,
  type Property,
  parsePestSprayRoomList,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import { propertyLabel } from '../features/work-items'

type CleaningView = 'logs' | 'bathrooms' | 'locks' | 'pest-spray'

const registerOptions = [
  { value: 'logs', label: 'Cleaning log', icon: Sparkles },
  { value: 'bathrooms', label: 'Bathrooms', icon: Bath },
  { value: 'locks', label: 'Goki locks', icon: KeyRound },
  { value: 'pest-spray', label: 'Pest spray', icon: Bug },
] as const

const propertyChoices = PROPERTY_OPTIONS.filter((option) => option.value !== 'all')
const lockChangedOptions = [
  { value: 'not-changed', label: 'Not changed' },
  { value: 'changed', label: 'Changed' },
] as const

const MAX_BULK_REGISTER_ENTRIES = 100
const MAX_REGISTER_ENTRY_NAME_LENGTH = 120
const MAX_PEST_SPRAY_IMPORT_ENTRIES = 500

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

function normalizeRegisterEntryName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

function registerEntryNameKey(value: string): string {
  return normalizeRegisterEntryName(value).toLocaleLowerCase()
}

function parseRegisterEntryNames(value: string): { names: string[]; duplicateCount: number } {
  const seen = new Set<string>()
  const names: string[] = []
  let duplicateCount = 0

  for (const rawName of value.split(/[\r\n,;]+/)) {
    const name = normalizeRegisterEntryName(rawName)
    if (!name) continue

    const key = registerEntryNameKey(name)
    if (seen.has(key)) {
      duplicateCount += 1
      continue
    }

    seen.add(key)
    names.push(name)
  }

  return { names, duplicateCount }
}

export function CleaningPage({ workspace, query }: CleaningPageProps) {
  const [view, setView] = useState<CleaningView>('logs')
  const [cleaningEditorOpen, setCleaningEditorOpen] = useState(false)
  const [bathroomEditorOpen, setBathroomEditorOpen] = useState(false)
  const [bathroomBulkOpen, setBathroomBulkOpen] = useState(false)
  const [lockEditorOpen, setLockEditorOpen] = useState(false)
  const [lockBulkOpen, setLockBulkOpen] = useState(false)
  const [pestSprayBulkOpen, setPestSprayBulkOpen] = useState(false)
  const [pestSprayMasterImportOpen, setPestSprayMasterImportOpen] = useState(false)
  const [pestSprayImportOpen, setPestSprayImportOpen] = useState(false)
  const [pestSprayReportRoom, setPestSprayReportRoom] = useState<PestSprayEntry | null>(null)
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
  const pestSprayEntries = useMemo(
    () => workspace.data.pestSprayEntries.filter((entry) =>
      includesSearch(
        query,
        entry.roomName,
        entry.sprayDates.join(' '),
        propertyLabel(entry.property),
      )),
    [query, workspace.data.pestSprayEntries],
  )

  const addLabel = view === 'logs' ? 'Add cleaning note' : 'Add Goki lock'
  const addIcon = view === 'locks' ? KeyRound : Plus

  function openNew() {
    if (view === 'logs') {
      setEditingCleaning(null)
      setCleaningEditorOpen(true)
    } else if (view === 'bathrooms') {
      setEditingBathroom(null)
      setBathroomEditorOpen(true)
    } else if (view === 'locks') {
      setEditingLock(null)
      setLockEditorOpen(true)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Property operations"
        title="Cleaning registers"
        description={<p>Keep the regular cleaning log, deep-clean every bathroom by property, maintain Goki locks, and track pest spray history room by room.</p>}
        actions={view === 'bathrooms' ? (
          <>
            <Button
              variant="secondary"
              leadingIcon={ListPlus}
              onClick={() => setBathroomBulkOpen(true)}
            >
              Add list
            </Button>
            <Button leadingIcon={Bath} onClick={openNew}>Add bathroom</Button>
          </>
        ) : view === 'locks' ? (
          <>
            <Button
              variant="secondary"
              leadingIcon={ListPlus}
              onClick={() => setLockBulkOpen(true)}
            >
              Add room list
            </Button>
            <Button leadingIcon={KeyRound} onClick={openNew}>Add Goki lock</Button>
          </>
        ) : view === 'pest-spray' ? (
          <>
            <Button
              variant="secondary"
              leadingIcon={ListPlus}
              onClick={() => setPestSprayBulkOpen(true)}
            >
              Add room list
            </Button>
            <Button
              variant="secondary"
              leadingIcon={ListPlus}
              onClick={() => setPestSprayMasterImportOpen(true)}
            >
              Paste master rooms
            </Button>
            <Button leadingIcon={Bug} onClick={() => setPestSprayImportOpen(true)}>
              Paste spray list
            </Button>
          </>
        ) : (
          <Button leadingIcon={addIcon} onClick={openNew}>{addLabel}</Button>
        )}
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
          onNew={() => setBathroomBulkOpen(true)}
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
          onNew={() => setLockBulkOpen(true)}
          onEdit={(entry) => {
            setEditingLock(entry)
            setLockEditorOpen(true)
          }}
          onDelete={workspace.deleteGokiLockEntry}
        />
      ) : null}
      {view === 'pest-spray' ? (
        <PestSprayRegister
          entries={pestSprayEntries}
          query={query}
          today={workspace.today}
          onAddRoomList={() => setPestSprayBulkOpen(true)}
          onMasterImport={() => setPestSprayMasterImportOpen(true)}
          onOpenReport={setPestSprayReportRoom}
          onDelete={workspace.deletePestSprayEntry}
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
      <BathroomBulkModal
        open={bathroomBulkOpen}
        existingEntries={workspace.data.bathroomCleaningEntries}
        onClose={() => setBathroomBulkOpen(false)}
        onSave={(property, bathroomNames) => {
          workspace.addBathroomCleaningEntries(
            bathroomNames.map((bathroomName) => ({ property, bathroomName })),
          )
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
      <GokiLockBulkModal
        open={lockBulkOpen}
        existingEntries={workspace.data.gokiLockEntries}
        onClose={() => setLockBulkOpen(false)}
        onSave={(property, roomNames) => {
          workspace.addGokiLockEntries(
            roomNames.map((roomName) => ({ property, roomName })),
          )
        }}
      />
      <PestSprayBulkModal
        open={pestSprayBulkOpen}
        existingEntries={workspace.data.pestSprayEntries}
        onClose={() => setPestSprayBulkOpen(false)}
        onSave={(property, roomNames) => {
          workspace.addPestSprayEntries(
            roomNames.map((roomName) => ({ property, roomName })),
          )
          workspace.flush()
        }}
      />
      <PestSprayImportModal
        open={pestSprayImportOpen}
        today={workspace.today}
        onClose={() => setPestSprayImportOpen(false)}
        onSave={(sprayDate, rooms) => {
          workspace.recordPestSpray(sprayDate, rooms)
          workspace.flush()
        }}
      />
      <PestSprayMasterImportModal
        open={pestSprayMasterImportOpen}
        onClose={() => setPestSprayMasterImportOpen(false)}
        onSave={(rooms) => {
          const entries = workspace.addPestSprayEntries(rooms)
          workspace.flush()
          return entries
        }}
      />
      <PestSprayRoomReportModal
        entry={pestSprayReportRoom}
        today={workspace.today}
        onClose={() => setPestSprayReportRoom(null)}
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
                <Button size="sm" variant="quiet" leadingIcon={Edit3} onClick={() => onEdit(entry)}>
                  Fill details
                </Button>
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

function PestSprayRegister({
  entries,
  query,
  today,
  onAddRoomList,
  onMasterImport,
  onOpenReport,
  onDelete,
}: {
  entries: PestSprayEntry[]
  query: string
  today: string
  onAddRoomList: () => void
  onMasterImport: () => void
  onOpenReport: (entry: PestSprayEntry) => void
  onDelete: (id: string) => void
}) {
  const twoMonthsAgo = format(subMonths(fromISODate(today), 2), 'yyyy-MM-dd')

  return (
    <div className="pest-spray-register">
      {!entries.length && !query ? (
        <section className="section-card pest-spray-register__intro">
          <div>
            <strong>Set up your property room register</strong>
            <p>Paste the master room list once. Every room stays visible here, ready for each pest-spray update.</p>
          </div>
          <div className="pest-spray-register__intro-actions">
            <Button size="sm" variant="secondary" leadingIcon={ListPlus} onClick={onMasterImport}>Paste master rooms</Button>
            <Button size="sm" leadingIcon={Plus} onClick={onAddRoomList}>Add room list</Button>
          </div>
        </section>
      ) : null}

      {propertyChoices.map((option) => {
        const propertyEntries = entries
          .filter((entry) => entry.property === option.value)
          .sort((left, right) => left.roomName.localeCompare(right.roomName, undefined, { numeric: true, sensitivity: 'base' }))

        return (
          <section className="section-card pest-spray-group" key={option.value}>
            <div className="section-card__header">
              <div className="section-card__heading">
                <Bug aria-hidden="true" />
                <h2 className="section-card__title">{option.label}</h2>
                <span className="section-card__count">{propertyEntries.length}</span>
              </div>
              <PropertyBadge property={option.label} size="sm" />
            </div>
            <div className="section-card__body">
              <div className="pest-spray-table-wrap">
                <table className="pest-spray-table">
                  <thead>
                    <tr>
                      <th scope="col">Room</th>
                      <th scope="col">Last sprayed</th>
                      <th scope="col">Recent dates</th>
                      <th scope="col">Past 2 months</th>
                      <th scope="col">Pest sprayed?</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyEntries.length ? propertyEntries.map((entry) => {
                      const recentDates = entry.sprayDates.filter((date) => date >= twoMonthsAgo)
                      const displayDates = entry.sprayDates.slice(0, 3)
                      const hasBeenSprayed = entry.sprayDates.length > 0

                      return (
                        <tr key={entry.id}>
                          <td>
                            <button className="pest-spray-table__room" type="button" onClick={() => onOpenReport(entry)}>
                              {entry.roomName || 'Unnamed room'}
                            </button>
                          </td>
                          <td><DateValue value={entry.sprayDates[0] ?? null} empty="Not yet" /></td>
                          <td className="pest-spray-table__dates">
                            {displayDates.length
                              ? displayDates.map((date) => format(fromISODate(date), 'd MMM')).join(' · ')
                              : '—'}
                          </td>
                          <td><span className="pest-spray-table__count">{recentDates.length} {recentDates.length === 1 ? 'time' : 'times'}</span></td>
                          <td>
                            <span className={`register-state ${hasBeenSprayed ? 'register-state--sprayed' : 'register-state--not-sprayed'}`}>
                              {hasBeenSprayed ? <Check aria-hidden="true" /> : null}
                              {hasBeenSprayed ? 'Sprayed' : 'Not sprayed'}
                            </span>
                          </td>
                          <td>
                            <IconButton
                              label={`Delete ${entry.roomName || 'room'} from the pest spray register`}
                              icon={Trash2}
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Delete this room and its pest spray history?')) onDelete(entry.id)
                              }}
                            />
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td className="pest-spray-table__empty" colSpan={6}>
                          {query ? 'No matching rooms in this property.' : 'No rooms added yet. Paste or add this property’s room list.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function PestSprayRoomReportModal({
  entry,
  today,
  onClose,
}: {
  entry: PestSprayEntry | null
  today: string
  onClose: () => void
}) {
  const twoMonthsAgo = format(subMonths(fromISODate(today), 2), 'yyyy-MM-dd')
  const recentDates = entry?.sprayDates.filter((date) => date >= twoMonthsAgo) ?? []

  return (
    <Modal
      open={Boolean(entry)}
      onClose={onClose}
      title={`${entry?.roomName ?? 'Room'} pest spray report`}
      description={entry ? `${propertyLabel(entry.property)} · Full history and the past two months.` : undefined}
      footer={<Button onClick={onClose}>Close report</Button>}
    >
      {entry ? (
        <div className="pest-spray-report">
          <div className="pest-spray-report__summary">
            <section className="pest-spray-report__metric">
              <strong>{recentDates.length}</strong>
              <span>{recentDates.length === 1 ? 'time sprayed' : 'times sprayed'} in the past two months</span>
            </section>
            <section className="pest-spray-report__latest">
              <small>Latest spray</small>
              <strong><DateValue value={entry.sprayDates[0] ?? null} empty="Not sprayed yet" /></strong>
            </section>
          </div>

          <section className="pest-spray-report__history">
            <h3>Past two months</h3>
            {recentDates.length ? (
              <ul>
                {recentDates.map((date) => <li key={date}>{format(fromISODate(date), 'EEEE, d MMMM yyyy')}</li>)}
              </ul>
            ) : <p>No pest spray recorded in the past two months.</p>}
          </section>

          <section className="pest-spray-report__history">
            <h3>All recorded spray dates</h3>
            {entry.sprayDates.length ? (
              <ul>
                {entry.sprayDates.map((date) => <li key={date}>{format(fromISODate(date), 'EEEE, d MMMM yyyy')}</li>)}
              </ul>
            ) : <p>No pest spray has been recorded for this room yet.</p>}
          </section>
        </div>
      ) : null}
    </Modal>
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
        <TextField label="Bathroom / ensuite" placeholder="e.g. Allen 13 or Ensuite Allen 3" value={bathroomName} maxLength={MAX_REGISTER_ENTRY_NAME_LENGTH} required autoFocus fieldClassName="form-grid__full" onChange={(event) => setBathroomName(event.target.value)} />
        <SelectField label="Property" value={property} options={propertyChoices} onChange={(event) => setProperty(event.target.value as Property)} />
        <SelectField label="Deep cleaned?" value={deepCleaningState} options={BATHROOM_CLEANING_STATE_OPTIONS} onChange={(event) => setDeepCleaningState(event.target.value as BathroomCleaningState)} />
        <TextField label="Deep cleaning date" type="date" value={cleaningDate} onChange={(event) => setCleaningDate(event.target.value)} />
        <TextField label="Cleaner name" placeholder="e.g. Sobit" value={cleanerName} onChange={(event) => setCleanerName(event.target.value)} />
        <TextareaField label="Notes" placeholder="Access, repairs, condition, or any important detail…" value={notes} rows={5} fieldClassName="form-grid__full" onChange={(event) => setNotes(event.target.value)} />
      </form>
    </Modal>
  )
}

interface BathroomBulkModalProps {
  open: boolean
  existingEntries: BathroomCleaningEntry[]
  onClose: () => void
  onSave: (property: Property, bathroomNames: string[]) => void
}

interface BulkRegisterModalProps<Entry extends { property: Property }> {
  open: boolean
  existingEntries: Entry[]
  getEntryName: (entry: Entry) => string
  onClose: () => void
  onSave: (property: Property, names: string[]) => void
  title: string
  description: string
  formId: string
  entryLabel: string
  entryLabelPlural: string
  inputLabel: string
  inputPlaceholder: string
  previewAriaLabel: string
  generatedExample: string
  initialPrefix: string
  prefixPlaceholder: string
  defaultPrefixForProperty: (property: Property) => string
  startingDetails: string
}

function BulkRegisterModal<Entry extends { property: Property }>({
  open,
  existingEntries,
  getEntryName,
  onClose,
  onSave,
  title,
  description,
  formId,
  entryLabel,
  entryLabelPlural,
  inputLabel,
  inputPlaceholder,
  previewAriaLabel,
  generatedExample,
  initialPrefix,
  prefixPlaceholder,
  defaultPrefixForProperty,
  startingDetails,
}: BulkRegisterModalProps<Entry>) {
  const [property, setProperty] = useState<Property>('allen')
  const [namesText, setNamesText] = useState('')
  const [prefix, setPrefix] = useState(initialPrefix)
  const [startNumber, setStartNumber] = useState('1')
  const [endNumber, setEndNumber] = useState('25')
  const [generatorError, setGeneratorError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setProperty('allen')
    setNamesText('')
    setPrefix(defaultPrefixForProperty('allen'))
    setStartNumber('1')
    setEndNumber('25')
    setGeneratorError('')
    setSubmitted(false)
  }, [defaultPrefixForProperty, open])

  const parsedNames = useMemo(() => parseRegisterEntryNames(namesText), [namesText])
  const existingNameKeys = useMemo(
    () => new Set(
      existingEntries
        .filter((entry) => entry.property === property)
        .map((entry) => registerEntryNameKey(getEntryName(entry))),
    ),
    [existingEntries, getEntryName, property],
  )
  const newNames = useMemo(
    () => parsedNames.names.filter((name) => !existingNameKeys.has(registerEntryNameKey(name))),
    [existingNameKeys, parsedNames.names],
  )
  const existingDuplicateCount = parsedNames.names.length - newNames.length
  const tooManyNames = newNames.length > MAX_BULK_REGISTER_ENTRIES
  const overlongName = newNames.find((name) => name.length > MAX_REGISTER_ENTRY_NAME_LENGTH)
  let namesError: string | undefined
  if (tooManyNames) {
    namesError = `Add up to ${MAX_BULK_REGISTER_ENTRIES} new ${entryLabelPlural} at a time.`
  } else if (overlongName) {
    const truncatedName = `${overlongName.slice(0, 32)}${overlongName.length > 32 ? '…' : ''}`
    namesError = `“${truncatedName}” is too long. Keep each name under ${MAX_REGISTER_ENTRY_NAME_LENGTH} characters.`
  } else if (submitted && newNames.length === 0) {
    namesError = parsedNames.names.length
      ? 'Every name in this list already exists for the selected property.'
      : `Add at least one ${entryLabel} name or number.`
  }

  function appendNumberedNames() {
    if (!startNumber.trim() || !endNumber.trim()) {
      setGeneratorError('Enter both a starting and ending number.')
      return
    }
    const start = Number(startNumber)
    const end = Number(endNumber)
    if (
      !Number.isInteger(start)
      || !Number.isInteger(end)
      || start < 0
      || end > 9999
      || end < start
    ) {
      setGeneratorError('Use whole numbers, with the ending number after the starting number.')
      return
    }

    const count = end - start + 1
    if (count > MAX_BULK_REGISTER_ENTRIES) {
      setGeneratorError(`Generate up to ${MAX_BULK_REGISTER_ENTRIES} names at a time.`)
      return
    }

    const cleanPrefix = normalizeRegisterEntryName(prefix)
    const generatedNames = Array.from(
      { length: count },
      (_, index) => [cleanPrefix, start + index].filter(Boolean).join(' '),
    )
    setNamesText((current) =>
      [current.trim(), generatedNames.join('\n')].filter(Boolean).join('\n'),
    )
    setGeneratorError('')
    setSubmitted(false)
  }

  function submitBulkEntries(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!newNames.length || tooManyNames || overlongName) return
    onSave(property, newNames)
    onClose()
  }

  const duplicateCount = parsedNames.duplicateCount + existingDuplicateCount
  const previewNames = newNames.slice(0, 12)
  const saveLabel = newNames.length
    ? `Add ${newNames.length} ${newNames.length === 1 ? entryLabel : entryLabelPlural}`
    : `Add ${entryLabelPlural}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="register-bulk-dialog"
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form={formId}
            leadingIcon={ListPlus}
            disabled={!newNames.length || tooManyNames || Boolean(overlongName)}
          >
            {saveLabel}
          </Button>
        </>
      )}
    >
      <form
        id={formId}
        className="form-grid register-bulk-form"
        onSubmit={submitBulkEntries}
      >
        <SelectField
          label="Property"
          value={property}
          options={propertyChoices}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            const nextProperty = event.target.value as Property
            setProperty(nextProperty)
            if (!namesText.trim()) setPrefix(defaultPrefixForProperty(nextProperty))
            setSubmitted(false)
          }}
        />

        <section className="register-generator form-grid__full" aria-labelledby={`${formId}-generator-title`}>
          <div className="register-generator__heading">
            <div>
              <h3 id={`${formId}-generator-title`}>Quick numbered list</h3>
              <p>{generatedExample}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={appendNumberedNames}>
              Add generated names
            </Button>
          </div>
          <div className="register-generator__fields">
            <TextField
              label="Name before number"
              placeholder={prefixPlaceholder}
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
            <TextField
              label="From"
              type="number"
              min="0"
              max="9999"
              value={startNumber}
              onChange={(event) => setStartNumber(event.target.value)}
            />
            <TextField
              label="To"
              type="number"
              min="0"
              max="9999"
              value={endNumber}
              onChange={(event) => setEndNumber(event.target.value)}
            />
          </div>
          {generatorError ? <p className="register-generator__error" role="alert">{generatorError}</p> : null}
        </section>

        <TextareaField
          label={inputLabel}
          hint="One per line. You can also paste names separated by commas or semicolons."
          placeholder={inputPlaceholder}
          value={namesText}
          rows={9}
          required
          data-autofocus
          error={namesError}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            setNamesText(event.target.value)
            setSubmitted(false)
          }}
        />

        <div className="register-bulk-preview form-grid__full" aria-live="polite">
          <div className="register-bulk-preview__heading">
            <strong>{newNames.length} new {newNames.length === 1 ? entryLabel : entryLabelPlural} ready</strong>
            <span>{propertyLabel(property)}</span>
          </div>
          {duplicateCount ? (
            <p>{duplicateCount} duplicate {duplicateCount === 1 ? 'name is' : 'names are'} skipped automatically.</p>
          ) : (
            <p>{startingDetails}</p>
          )}
          {previewNames.length ? (
            <ul className="register-bulk-preview__names" aria-label={previewAriaLabel}>
              {previewNames.map((name) => <li key={registerEntryNameKey(name)}>{name}</li>)}
              {newNames.length > previewNames.length ? <li>+{newNames.length - previewNames.length} more</li> : null}
            </ul>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}

function BathroomBulkModal({
  open,
  existingEntries,
  onClose,
  onSave,
}: BathroomBulkModalProps) {
  return (
    <BulkRegisterModal
      open={open}
      existingEntries={existingEntries}
      getEntryName={(entry) => entry.bathroomName}
      onClose={onClose}
      onSave={onSave}
      title="Add a bathroom list"
      description="Create a full property register now, then fill each bathroom's cleaning details as the work happens."
      formId="bathroom-bulk-form"
      entryLabel="bathroom"
      entryLabelPlural="bathrooms"
      inputLabel="Bathroom / ensuite names or numbers"
      inputPlaceholder={'Allen 1\nAllen 2\nEnsuite Allen 3'}
      previewAriaLabel="Bathrooms ready to add"
      generatedExample="For example, generate Allen 1 through Allen 25."
      initialPrefix="Allen"
      prefixPlaceholder="e.g. Allen or Ensuite Allen"
      defaultPrefixForProperty={propertyLabel}
      startingDetails="New entries start as “Not deep cleaned” with empty details."
    />
  )
}

interface GokiLockBulkModalProps {
  open: boolean
  existingEntries: GokiLockEntry[]
  onClose: () => void
  onSave: (property: Property, roomNames: string[]) => void
}

function gokiRoomPrefix(): string {
  return 'Room'
}

function GokiLockBulkModal({
  open,
  existingEntries,
  onClose,
  onSave,
}: GokiLockBulkModalProps) {
  return (
    <BulkRegisterModal
      open={open}
      existingEntries={existingEntries}
      getEntryName={(entry) => entry.roomName}
      onClose={onClose}
      onSave={onSave}
      title="Add a Goki lock room list"
      description="Create a full property room register now, then fill each lock's replacement details as work happens."
      formId="goki-lock-bulk-form"
      entryLabel="room"
      entryLabelPlural="rooms"
      inputLabel="Room names or numbers"
      inputPlaceholder={'Room 101\nRoom 102\nAllen 13'}
      previewAriaLabel="Goki lock rooms ready to add"
      generatedExample="For example, generate Room 1 through Room 25."
      initialPrefix="Room"
      prefixPlaceholder="e.g. Room or Allen room"
      defaultPrefixForProperty={gokiRoomPrefix}
      startingDetails="New entries start as “Not changed” with empty details."
    />
  )
}

interface PestSprayBulkModalProps {
  open: boolean
  existingEntries: PestSprayEntry[]
  onClose: () => void
  onSave: (property: Property, roomNames: string[]) => void
}

function PestSprayBulkModal({
  open,
  existingEntries,
  onClose,
  onSave,
}: PestSprayBulkModalProps) {
  return (
    <BulkRegisterModal
      open={open}
      existingEntries={existingEntries}
      getEntryName={(entry) => entry.roomName}
      onClose={onClose}
      onSave={onSave}
      title="Add a pest spray room list"
      description="Build each property's room register once. Later, paste the empty-room report to record every room sprayed that day."
      formId="pest-spray-bulk-form"
      entryLabel="room"
      entryLabelPlural="rooms"
      inputLabel="Room names or numbers"
      inputPlaceholder={'Room 1\nRoom 2\nRoom 101'}
      previewAriaLabel="Pest spray rooms ready to add"
      generatedExample="For example, generate Room 1 through Room 25."
      initialPrefix="Room"
      prefixPlaceholder="e.g. Room"
      defaultPrefixForProperty={gokiRoomPrefix}
      startingDetails="New rooms have no spray record until they appear in a pasted spray list."
    />
  )
}

function PestSprayRoomPreview({
  rooms,
  title,
  sprayDate,
}: {
  rooms: PestSprayRoomInput[]
  title: string
  sprayDate?: string
}) {
  const groupedRooms = propertyChoices
    .map((propertyOption) => ({
      property: propertyOption.value,
      rooms: rooms.filter((room) => room.property === propertyOption.value),
    }))
    .filter((group) => group.rooms.length)

  return (
    <section className="pest-spray-import__preview form-grid__full" aria-live="polite">
      <div className="pest-spray-import__preview-heading">
        <strong>{rooms.length} rooms ready to {title}</strong>
        {sprayDate ? <span>{format(fromISODate(sprayDate), 'd MMM yyyy')}</span> : null}
      </div>
      {groupedRooms.length ? (
        <div className="pest-spray-import__groups">
          {groupedRooms.map((group) => (
            <div className="pest-spray-import__group" key={group.property}>
              <PropertyBadge property={propertyLabel(group.property)} size="sm" />
              <span>{group.rooms.map((room) => room.roomName).join(', ')}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>Add a property heading followed by its room list to preview the rooms before saving.</p>
      )}
    </section>
  )
}

function PestSprayMasterImportModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (rooms: PestSprayRoomInput[]) => PestSprayEntry[]
}) {
  const [listText, setListText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setListText('')
    setSubmitted(false)
  }, [open])

  const parsedRooms = useMemo(() => parsePestSprayRoomList(listText), [listText])
  const tooManyRooms = parsedRooms.length > MAX_PEST_SPRAY_IMPORT_ENTRIES
  const listError = tooManyRooms
    ? `Paste up to ${MAX_PEST_SPRAY_IMPORT_ENTRIES} rooms at once.`
    : submitted && !parsedRooms.length
      ? 'Add a property heading and at least one room number.'
      : undefined

  function saveMasterRooms(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!parsedRooms.length || tooManyRooms) return
    if (onSave(parsedRooms).length) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="pest-spray-import-dialog"
      title="Paste master room list"
      description="Paste the full room list for all five properties. Only a property heading and a room number are kept—codes, floor details, bed counts, and notes are ignored."
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="pest-spray-master-form"
            leadingIcon={ListPlus}
            disabled={!parsedRooms.length || tooManyRooms}
          >
            Add {parsedRooms.length || ''} {parsedRooms.length === 1 ? 'room' : 'rooms'}
          </Button>
        </>
      )}
    >
      <form id="pest-spray-master-form" className="form-grid" onSubmit={saveMasterRooms}>
        <TextareaField
          label="All property room lists"
          hint="Paste the full spreadsheet or report. It can contain extra information; only room labels such as Room 101 under a property heading are used."
          placeholder={'Central\nRoom 101\nRoom 102\n\nPotts Point\nRoom 1\nRoom 2'}
          value={listText}
          rows={15}
          required
          data-autofocus
          error={listError}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            setListText(event.target.value)
            setSubmitted(false)
          }}
        />
        <PestSprayRoomPreview rooms={parsedRooms} title="add" />
      </form>
    </Modal>
  )
}

function PestSprayImportModal({
  open,
  today,
  onClose,
  onSave,
}: {
  open: boolean
  today: string
  onClose: () => void
  onSave: (sprayDate: string, rooms: PestSprayRoomInput[]) => void
}) {
  const [sprayDate, setSprayDate] = useState('')
  const [listText, setListText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setSprayDate(today)
    setListText('')
    setSubmitted(false)
  }, [open, today])

  const parsedRooms = useMemo(() => parsePestSprayRoomList(listText), [listText])
  const tooManyRooms = parsedRooms.length > MAX_PEST_SPRAY_IMPORT_ENTRIES
  const listError = tooManyRooms
    ? `Paste up to ${MAX_PEST_SPRAY_IMPORT_ENTRIES} rooms at once.`
    : submitted && !parsedRooms.length
      ? 'Add a property heading and at least one room number.'
      : undefined

  function saveSprayList(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!sprayDate || !parsedRooms.length || tooManyRooms) return
    onSave(sprayDate, parsedRooms)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="pest-spray-import-dialog"
      title="Paste pest spray list"
      description="Paste the daily empty-room report. The matching rooms will be marked as sprayed on the chosen date, while older spray records stay intact."
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="pest-spray-import-form"
            leadingIcon={Bug}
            disabled={!sprayDate || !parsedRooms.length || tooManyRooms}
          >
            Record {parsedRooms.length || ''} sprayed {parsedRooms.length === 1 ? 'room' : 'rooms'}
          </Button>
        </>
      )}
    >
      <form id="pest-spray-import-form" className="form-grid" onSubmit={saveSprayList}>
        <TextField
          label="Sprayed on"
          type="date"
          value={sprayDate}
          required
          onChange={(event) => setSprayDate(event.target.value)}
        />
        <div className="pest-spray-import__guide">
          <Bug aria-hidden="true" />
          <span>Headings can be in any order. Use property names such as Central, Allen, Pyrmont, Olympic, or Potts Point.</span>
        </div>
        <TextareaField
          label="Empty rooms that received pest spray"
          hint="The parser understands headings, markdown bullets, Room 7, 7, and comma-separated room numbers."
          placeholder={'OLYMPIC – Empty Rooms\n- Room 7\n- Room 8\n\nPOTTS POINT\nRooms 101, 104, 105'}
          value={listText}
          rows={12}
          required
          data-autofocus
          error={listError}
          fieldClassName="form-grid__full"
          onChange={(event) => {
            setListText(event.target.value)
            setSubmitted(false)
          }}
        />
        <PestSprayRoomPreview rooms={parsedRooms} title="record" sprayDate={sprayDate} />
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
