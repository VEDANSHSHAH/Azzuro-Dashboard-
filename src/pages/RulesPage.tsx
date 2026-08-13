import { useEffect, useMemo, useState } from 'react'
import { FilePlus2, Pin, ScrollText, Trash2 } from 'lucide-react'
import { Button, EmptyState, IconButton, PageHeader, SaveIndicator } from '../components'
import type { WorkspaceApi } from '../hooks'

interface RulesPageProps {
  workspace: WorkspaceApi
  query: string
}

export function RulesPage({ workspace, query }: RulesPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const rules = useMemo(
    () => workspace.data.ruleNotes
      .filter((rule) => !normalizedQuery || `${rule.title} ${rule.content} ${rule.category}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => Number(right.pinned) - Number(left.pinned)),
    [normalizedQuery, workspace.data.ruleNotes],
  )

  useEffect(() => {
    if (!rules.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !rules.some((rule) => rule.id === selectedId)) setSelectedId(rules[0].id)
  }, [rules, selectedId])

  const selectedRule = workspace.data.ruleNotes.find((rule) => rule.id === selectedId) ?? null

  function addRule() {
    const rule = workspace.addRuleNote({ title: 'Untitled rule', category: 'General' })
    setSelectedId(rule.id)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Living knowledge base"
        title="General rules"
        description={<p>Keep procedures, property guidance, and the small details that make operations run smoothly.</p>}
        actions={<Button leadingIcon={FilePlus2} onClick={addRule}>New rule</Button>}
      />

      {workspace.data.ruleNotes.length ? (
        <div className="rules-layout">
          <aside className="rules-list">
            <div className="rules-list__header">
              <h2 className="rules-list__title">Rule notes</h2>
              <span className="section-card__count">{rules.length}</span>
            </div>
            <div className="rules-list__items">
              {rules.map((rule) => (
                <button
                  type="button"
                  key={rule.id}
                  className={`rule-list-item${rule.id === selectedId ? ' rule-list-item--active' : ''}`}
                  onClick={() => setSelectedId(rule.id)}
                >
                  <span className="rule-list-item__top">
                    <span className="rule-list-item__title">{rule.title || 'Untitled rule'}</span>
                    {rule.pinned ? <Pin aria-label="Pinned" /> : null}
                  </span>
                  <span className="rule-list-item__preview">{rule.category || rule.content || 'Empty note'}</span>
                </button>
              ))}
              {!rules.length ? <p className="rules-list__no-results">No rules match your search.</p> : null}
            </div>
          </aside>

          {selectedRule ? (
            <section className="rule-editor">
              <div className="rule-editor__toolbar">
                <input
                  className="rule-editor__category"
                  value={selectedRule.category}
                  aria-label="Rule category"
                  placeholder="Category"
                  onChange={(event) => workspace.updateRuleNote(selectedRule.id, { category: event.target.value })}
                />
                <div className="toolbar">
                  <SaveIndicator state={workspace.saveState} />
                  <IconButton
                    label={selectedRule.pinned ? 'Unpin rule' : 'Pin rule'}
                    icon={Pin}
                    variant="quiet"
                    className={selectedRule.pinned ? 'icon-button--active' : undefined}
                    onClick={() => workspace.updateRuleNote(selectedRule.id, { pinned: !selectedRule.pinned })}
                  />
                  <IconButton
                    label="Delete rule"
                    icon={Trash2}
                    variant="danger"
                    onClick={() => {
                      if (window.confirm('Delete this rule note?')) workspace.deleteRuleNote(selectedRule.id)
                    }}
                  />
                </div>
              </div>
              <input
                className="rule-editor__title"
                value={selectedRule.title}
                aria-label="Rule title"
                placeholder="Name this rule"
                onChange={(event) => workspace.updateRuleNote(selectedRule.id, { title: event.target.value })}
              />
              <textarea
                className="rule-editor__content"
                value={selectedRule.content}
                aria-label={`${selectedRule.title || 'Rule'} content`}
                placeholder={'Write the rule here…\n\nUse short paragraphs, lists, and clear instructions.'}
                onChange={(event) => workspace.updateRuleNote(selectedRule.id, { content: event.target.value })}
              />
            </section>
          ) : null}
        </div>
      ) : (
        <div className="section-card">
          <EmptyState
            icon={ScrollText}
            title="Write your first general rule"
            description="Create a permanent note for procedures, standards, access instructions, or anything the team should remember."
            action={<Button leadingIcon={FilePlus2} onClick={addRule}>Create rule note</Button>}
          />
        </div>
      )}
    </div>
  )
}
