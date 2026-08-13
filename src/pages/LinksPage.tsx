import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
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
  PROPERTY_OPTIONS,
  type LinkEntry,
  type Property,
} from '../domain'
import type { WorkspaceApi } from '../hooks'
import { propertyLabel } from '../features/work-items'
import { isNativeApp, openExternalUrl } from '../native'

interface LinksPageProps {
  workspace: WorkspaceApi
  query: string
}

function normalizedUrl(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export function LinksPage({ workspace, query }: LinksPageProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<LinkEntry | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const links = useMemo(
    () => workspace.data.links.filter((link) =>
      !normalizedQuery || `${link.name} ${link.url} ${link.username} ${link.notes} ${propertyLabel(link.property)}`.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, workspace.data.links],
  )

  async function copy(value: string, key: string) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 1400)
  }

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(link: LinkEntry) {
    setEditing(link)
    setEditorOpen(true)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Quick access vault"
        title="Links & credentials"
        description={<p>Keep the operational sites you reach for every day—and the login details that belong with them.</p>}
        actions={<Button leadingIcon={Plus} onClick={openNew}>Save a link</Button>}
      />

      <div className="security-banner">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>{isNativeApp() ? 'Passwords are secured by Windows' : 'Secure desktop storage is ready'}</strong>
          <span>{isNativeApp() ? 'Passwords are stored in Windows Credential Manager, separate from your workspace database.' : 'Run the desktop build to store passwords in Windows Credential Manager.'}</span>
        </div>
      </div>

      {links.length ? (
        <div className="link-grid">
          {links.map((link) => {
            const passwordVisible = revealed.has(link.id)
            return (
              <article className="link-card" key={link.id}>
                <div className="link-card__top">
                  <div className="link-card__identity">
                    <span className="link-card__favicon">{link.name.trim().charAt(0) || <Link2 aria-hidden="true" />}</span>
                    <div className="link-card__copy">
                      <h2 className="link-card__name">{link.name || 'Untitled link'}</h2>
                      <span className="link-card__url">{link.url || 'No URL saved'}</span>
                    </div>
                  </div>
                  <div className="task-card__actions">
                    <IconButton
                      label="Open website"
                      icon={ExternalLink}
                      variant="quiet"
                      size="sm"
                      disabled={!normalizedUrl(link.url)}
                      onClick={() => {
                        const url = normalizedUrl(link.url)
                        if (url) void openExternalUrl(url)
                      }}
                    />
                    <IconButton label="Edit link" icon={Edit3} variant="quiet" size="sm" onClick={() => openEdit(link)} />
                    <IconButton
                      label="Delete link"
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Delete this saved link and its password?')) workspace.deleteLink(link.id)
                      }}
                    />
                  </div>
                </div>
                <div className="link-card__meta">
                  <PropertyBadge property={propertyLabel(link.property)} size="sm" />
                  {link.notes ? <span>{link.notes}</span> : null}
                </div>
                <div className="link-card__credentials">
                  <div className="credential-row">
                    <div className="credential-row__copy">
                      <span className="credential-row__label">Username</span>
                      <span className="credential-row__value">{link.username || 'Not saved'}</span>
                    </div>
                    <IconButton
                      label="Copy username"
                      title={copied === `${link.id}-username` ? 'Copied' : 'Copy username'}
                      icon={Copy}
                      variant="quiet"
                      size="sm"
                      disabled={!link.username}
                      onClick={() => void copy(link.username, `${link.id}-username`)}
                    />
                  </div>
                  <div className="credential-row">
                    <div className="credential-row__copy">
                      <span className="credential-row__label">Password</span>
                      <span className="credential-row__value">{link.password ? (passwordVisible ? link.password : '••••••••••') : 'Not saved'}</span>
                    </div>
                    <div className="credential-row__actions">
                      <IconButton
                        label={passwordVisible ? 'Hide password' : 'Reveal password'}
                        icon={passwordVisible ? EyeOff : Eye}
                        variant="quiet"
                        size="sm"
                        disabled={!link.password}
                        onClick={() => setRevealed((current) => {
                          const next = new Set(current)
                          if (next.has(link.id)) next.delete(link.id)
                          else next.add(link.id)
                          return next
                        })}
                      />
                      <IconButton
                        label="Copy password"
                        title={copied === `${link.id}-password` ? 'Copied' : 'Copy password'}
                        icon={Copy}
                        variant="quiet"
                        size="sm"
                        disabled={!link.password}
                        onClick={() => void copy(link.password, `${link.id}-password`)}
                      />
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="section-card">
          <EmptyState
            icon={KeyRound}
            title={query ? 'No matching links' : 'Your operations vault is empty'}
            description={query ? 'Try another search phrase.' : 'Save a site, username, password, and the context you need to get moving quickly.'}
            action={!query ? <Button leadingIcon={Plus} onClick={openNew}>Save first link</Button> : undefined}
          />
        </div>
      )}

      <LinkEditorModal
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
        onSave={(values) => {
          if (editing) workspace.updateLink(editing.id, values)
          else workspace.addLink(values)
        }}
      />
    </div>
  )
}

interface LinkValues {
  name: string
  url: string
  username: string
  password: string
  notes: string
  property: Property
}

interface LinkEditorModalProps {
  open: boolean
  entry: LinkEntry | null
  onClose: () => void
  onSave: (values: LinkValues) => void
}

function LinkEditorModal({ open, entry, onClose, onSave }: LinkEditorModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [property, setProperty] = useState<Property>('all')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(entry?.name ?? '')
    setUrl(entry?.url ?? '')
    setUsername(entry?.username ?? '')
    setPassword(entry?.password ?? '')
    setNotes(entry?.notes ?? '')
    setProperty(entry?.property ?? 'all')
    setShowPassword(false)
  }, [entry, open])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), url: url.trim(), username, password, notes, property })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit saved link' : 'Save a new link'}
      description="Credentials stay private on this device."
      footer={(
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="link-form" leadingIcon={KeyRound}>Save securely</Button>
        </>
      )}
    >
      <form id="link-form" className="form-grid" onSubmit={submit}>
        <TextField label="Name" value={name} required autoFocus placeholder="e.g. Booking portal" fieldClassName="form-grid__full" onChange={(event) => setName(event.target.value)} />
        <TextField label="Website URL" value={url} type="url" placeholder="https://example.com" fieldClassName="form-grid__full" onChange={(event) => setUrl(event.target.value)} />
        <TextField label="Username" value={username} autoComplete="off" onChange={(event) => setUsername(event.target.value)} />
        <div className="password-field field">
          <label className="field__label" htmlFor="link-password">Password</label>
          <div className="password-wrap">
            <input
              id="link-password"
              className="field__control field__input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
            />
            <IconButton label={showPassword ? 'Hide password' : 'Show password'} icon={showPassword ? EyeOff : Eye} variant="quiet" size="sm" onClick={() => setShowPassword((current) => !current)} />
          </div>
        </div>
        <SelectField label="Property" value={property} options={PROPERTY_OPTIONS} fieldClassName="form-grid__full" onChange={(event) => setProperty(event.target.value as Property)} />
        <TextareaField label="Notes" value={notes} rows={4} fieldClassName="form-grid__full" placeholder="Account context, recovery details, or reminders…" onChange={(event) => setNotes(event.target.value)} />
      </form>
    </Modal>
  )
}
