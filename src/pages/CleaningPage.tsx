import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { CalendarClock, Edit3, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  Button,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  PropertyBadge,
  SelectField,
  TextareaField,
  TextField,
} from '../components'
import {
  CLEANING_STATUS_OPTIONS,
  fromISODate,
  PROPERTY_OPTIONS,
  type CleaningEntry,
  type CleaningStatus,
  type Property,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import { propertyLabel } from '../features/work-items'

interface CleaningPageProps {
  workspace: WorkspaceApi
  query: string
}

export function CleaningPage({ workspace, query }: CleaningPageProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CleaningEntry | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const entries = useMemo(
    () => workspace.data.cleaningEntries.filter((entry) =>
      !normalizedQuery || `${entry.title} ${entry.notes} ${propertyLabel(entry.property)}`.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, workspace.data.cleaningEntries],
  )

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(entry: CleaningEntry) {
    setEditing(entry)
    setEditorOpen(true)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Property operations"
        title="Cleaning log"
        description={<p>Record what happened, keep the useful context, and know exactly when each property needs attention next.</p>}
        actions={<Button leadingIcon={Plus} onClick={openNew}>Add cleaning note</Button>}
      />

      {entries.length ? (
        <div className="cleaning-grid">
          {entries.map((entry) => {
            const isPastDue = entry.nextCleaningDate && entry.nextCleaningDate < workspace.today && entry.status !== 'completed'
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
                  <div>
                    <span className="cleaning-card__date-label">Last cleaned</span>
                    <span className="cleaning-card__date-value">
                      {entry.lastCleanedDate ? format(fromISODate(entry.lastCleanedDate), 'd MMM yyyy') : 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="cleaning-card__date-label">Next clean</span>
                    <span className="cleaning-card__date-value">
                      {entry.nextCleaningDate ? format(fromISODate(entry.nextCleaningDate), 'd MMM yyyy') : 'Not scheduled'}
                    </span>
                  </div>
                </div>
                <p className="cleaning-card__notes">{entry.notes || 'No cleaning notes yet.'}</p>
                <div className="cleaning-card__actions">
                  <Button size="sm" variant="secondary" leadingIcon={Edit3} onClick={() => openEdit(entry)}>Edit log</Button>
                  <IconButton
                    label="Delete cleaning log"
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Delete this cleaning log?')) workspace.deleteCleaningEntry(entry.id)
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="section-card">
          <EmptyState
            icon={Sparkles}
            title={query ? 'No matching cleaning notes' : 'Start your cleaning record'}
            description={query ? 'Try a different search phrase.' : 'Add the most recent clean and the next planned date for any property.'}
            action={!query ? <Button leadingIcon={Plus} onClick={openNew}>Add first log</Button> : undefined}
          />
        </div>
      )}

      <CleaningEditorModal
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
        onSave={(values) => {
          if (editing) workspace.updateCleaningEntry(editing.id, values)
          else workspace.addCleaningEntry(values)
        }}
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

interface CleaningEditorModalProps {
  open: boolean
  entry: CleaningEntry | null
  onClose: () => void
  onSave: (values: CleaningValues) => void
}

function CleaningEditorModal({ open, entry, onClose, onSave }: CleaningEditorModalProps) {
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

  function submit(event: FormEvent) {
    event.preventDefault()
    onSave({
      title: title.trim(),
      property,
      lastCleanedDate: lastCleanedDate || null,
      nextCleaningDate: nextCleaningDate || null,
      notes,
      status,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit cleaning log' : 'New cleaning log'}
      description="Keep this practical—what happened, what matters, and what comes next."
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="cleaning-form" leadingIcon={CalendarClock}>Save log</Button>
        </>
      )}
    >
      <form id="cleaning-form" className="form-grid" onSubmit={submit}>
        <TextField
          label="Log name"
          placeholder="e.g. Post-checkout clean"
          value={title}
          fieldClassName="form-grid__full"
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
        />
        <SelectField label="Property" value={property} options={PROPERTY_OPTIONS.filter((option) => option.value !== 'all')} onChange={(event) => setProperty(event.target.value as Property)} />
        <SelectField label="Status" value={status} options={CLEANING_STATUS_OPTIONS} onChange={(event) => setStatus(event.target.value as CleaningStatus)} />
        <TextField label="Last cleaned" type="date" value={lastCleanedDate} onChange={(event) => setLastCleanedDate(event.target.value)} />
        <TextField label="Next cleaning" type="date" value={nextCleaningDate} onChange={(event) => setNextCleaningDate(event.target.value)} />
        <TextareaField
          label="Cleaning notes"
          placeholder="Condition, supplies, issues, access details…"
          value={notes}
          rows={7}
          fieldClassName="form-grid__full"
          onChange={(event) => setNotes(event.target.value)}
        />
      </form>
    </Modal>
  )
}
