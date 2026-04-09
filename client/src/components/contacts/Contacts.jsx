import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'
import ContactTimeline from './ContactTimeline'

const STAGES = [
  { key: 'new',  label: 'Nuovo',   dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700' },
  { key: 'warm', label: 'Tiepido', dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700' },
  { key: 'hot',  label: 'Caldo',   dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700' },
  { key: 'won',  label: 'Vinto',   dot: 'bg-brand-500',  badge: 'bg-brand-50 text-brand-600' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s]))

const AVATARS = ['bg-brand-100 text-brand-700', 'bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700']

function ContactModal({ contact, onClose, onSaved, onDeleted }) {
  const { profile, team } = useApp()
  const isNew = !contact
  const [form, setForm] = useState({
    name: contact?.name || '',
    company: contact?.company || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    stage: contact?.stage || 'new',
    notes: contact?.notes || '',
    owner_id: contact?.owner?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let saved
      if (isNew) {
        const res = await api('/api/contacts', { method: 'POST', body: form })
        saved = res.contact
      } else {
        const res = await api(`/api/contacts/${contact.id}`, { method: 'PATCH', body: form })
        saved = res.contact
      }
      onSaved(saved, isNew)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function deleteContact() {
    if (!confirm(`Eliminare il contatto "${contact.name}"?`)) return
    setDeleting(true)
    try {
      await api(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      onDeleted(contact.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
          {!isNew && (
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-700 flex-shrink-0">
              {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 font-700 text-warm-900">
            {isNew ? 'Nuovo contatto' : contact.name}
          </div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {/* Tabs (only for existing contacts) */}
        {!isNew && (
          <div className="flex border-b border-warm-100 flex-shrink-0 overflow-x-auto scrollbar-none">
            {['info', 'task', 'storico'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-5 py-3 text-sm font-600 border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-warm-400 hover:text-warm-700'}`}>
                {t === 'info' ? 'Informazioni' : t === 'task' ? `Task (${(contact.tasks || []).length})` : '📋 Storico'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {(isNew || activeTab === 'info') && (
            <form id="contact-form" onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-warm-500 mb-1 block">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
                </div>
                <div>
                  <label className="text-xs font-600 text-warm-500 mb-1 block">Azienda</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-warm-500 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
                </div>
                <div>
                  <label className="text-xs font-600 text-warm-500 mb-1 block">Telefono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-warm-500 mb-1 block">Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                {team.length > 0 && profile?.role !== 'agent' && (
                  <div>
                    <label className="text-xs font-600 text-warm-500 mb-1 block">Assegnato a</label>
                    <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                      className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                      <option value="">Me stesso</option>
                      {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
              </div>
            </form>
          )}

          {!isNew && activeTab === 'storico' && (
            <ContactTimeline
              contactId={contact.id}
              contactName={contact.name}
              contactEmail={contact.email}
            />
          )}

          {!isNew && activeTab === 'task' && (
            <div className="space-y-2">
              {(contact.tasks || []).length === 0 && (
                <p className="text-sm text-warm-400 py-4 text-center">Nessun task collegato</p>
              )}
              {(contact.tasks || []).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-warm-50 border border-warm-200 rounded-xl">
                  <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${t.completed ? 'bg-brand-500 border-brand-500' : 'border-warm-300'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-500 ${t.completed ? 'text-warm-400 line-through' : 'text-warm-900'}`}>{t.title}</div>
                    {t.due_date && <div className="text-xs text-warm-400 mt-0.5">{new Date(t.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</div>}
                  </div>
                  {t.assignee && <span className="text-xs text-warm-400 flex-shrink-0">{t.assignee.full_name?.split(' ')[0]}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {!isNew && profile?.role === 'admin' && (
            <button onClick={deleteContact} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 font-500 border border-red-200 hover:border-red-300 rounded-xl px-4 py-2 transition-colors disabled:opacity-40">
              {deleting ? '...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-warm-500 hover:text-warm-700 font-500 border border-warm-200 rounded-xl px-4 py-2 transition-colors">
            Annulla
          </button>
          {(isNew || activeTab === 'info') && (
            <button form="contact-form" type="submit" disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 transition-colors disabled:opacity-40">
              {saving ? 'Salvo...' : isNew ? 'Crea' : 'Salva'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const { profile } = useApp()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | contact object

  const load = () => {
    api('/api/contacts')
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = contacts.filter(c => {
    if (filterStage && c.stage !== filterStage) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    }
    return true
  })

  function handleSaved(contact, isNew) {
    if (isNew) {
      setContacts(prev => [contact, ...prev])
    } else {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, ...contact } : c))
    }
  }

  function handleDeleted(id) {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold tracking-tight text-warm-900">Contatti</h1>
            <p className="text-xs text-warm-400 mt-0.5">{filtered.length} contatti</p>
          </div>
          <button onClick={() => setModal('new')}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10"/></svg>
            Nuovo
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-36 relative">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-300 pointer-events-none">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M14 14l-3-3"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, azienda, email..."
              className="w-full text-xs border border-warm-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-warm-700 focus:outline-none focus:border-brand-400"/>
          </div>
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
            className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white text-warm-700 font-medium focus:outline-none focus:border-brand-400">
            <option value="">Tutti gli stage</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="p-6 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-warm-200 animate-pulse"/>)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-300 gap-3 py-16">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
              <path d="M20 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM6 34a14 14 0 0 1 28 0"/>
            </svg>
            <p className="text-sm">{search || filterStage ? 'Nessun risultato' : 'Nessun contatto. Creane uno!'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-warm-50 border-b border-warm-200 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Contatto</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Azienda</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Responsabile</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Task aperti</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filtered.map((c, i) => {
                  const stage = stageMap[c.stage]
                  const openTasks = (c.tasks || []).filter(t => !t.completed)
                  const urgentTask = openTasks.find(t => t.urgent || (t.due_date && t.due_date < today))
                  return (
                    <tr key={c.id} onClick={() => setModal(c)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 ${AVATARS[i % 5]}`}>
                            {c.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-600 text-warm-900">{c.name}</div>
                            {c.email && <div className="text-xs text-warm-400">{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-600">{c.company || '—'}</td>
                      <td className="px-4 py-3">
                        {stage && (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-600 px-2 py-0.5 rounded-full ${stage.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`}/>
                            {stage.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{c.owner?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        {openTasks.length > 0 ? (
                          <span className={`text-xs font-600 ${urgentTask ? 'text-red-500' : 'text-warm-500'}`}>
                            {urgentTask ? '⚡ ' : ''}{openTasks.length} aperte
                          </span>
                        ) : (
                          <span className="text-xs text-warm-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-warm-400">
                          <path d="M6 12l4-4-4-4"/>
                        </svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-warm-100">
              {filtered.map((c, i) => {
                const stage = stageMap[c.stage]
                const openTasks = (c.tasks || []).filter(t => !t.completed)
                return (
                  <div key={c.id} onClick={() => setModal(c)} className="flex items-center gap-3 px-4 py-3 hover:bg-warm-50 cursor-pointer transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-700 flex-shrink-0 ${AVATARS[i % 5]}`}>
                      {c.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-600 text-warm-900 text-sm">{c.name}</div>
                      <div className="text-xs text-warm-400 truncate">{c.company}</div>
                    </div>
                    {stage && (
                      <span className={`text-2xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${stage.badge}`}>{stage.label}</span>
                    )}
                    {openTasks.length > 0 && (
                      <span className="text-xs text-warm-400 flex-shrink-0">{openTasks.length} task</span>
                    )}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-warm-300 flex-shrink-0">
                      <path d="M6 12l4-4-4-4"/>
                    </svg>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ContactModal
          contact={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
