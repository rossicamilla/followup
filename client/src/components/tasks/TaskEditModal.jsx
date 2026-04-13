import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'

const TYPE_OPTIONS = [
  { key: 'task',     label: 'Task',     icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M3 8h10M3 4h7M3 12h5"/>
    </svg>
  )},
  { key: 'chiamata', label: 'Chiamata', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M3 3.5a1 1 0 011-.9h1.8a.5.5 0 01.5.4l.7 2.8a.5.5 0 01-.14.5L6.3 7.5a7.5 7.5 0 003.2 3.2l1.2-1.6a.5.5 0 01.5-.14l2.8.7a.5.5 0 01.4.5v1.8a1 1 0 01-1 1C6.4 13 3 9.6 3 3.5z"/>
    </svg>
  )},
  { key: 'email',    label: 'Email',    icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="1.5" y="4" width="13" height="9" rx="1.5"/>
      <path d="M1.5 6.5l6.5 4 6.5-4"/>
    </svg>
  )},
  { key: 'meeting',  label: 'Meeting',  icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <circle cx="5.5" cy="5" r="2"/>
      <circle cx="10.5" cy="5" r="2"/>
      <path d="M1 13c0-2.5 2-4 4.5-4"/>
      <path d="M10.5 9c2.5 0 4.5 1.5 4.5 4H7.5"/>
    </svg>
  )},
]

const PRI_OPTIONS = [
  { key: 'bassa', label: 'Bassa', sel: 'bg-emerald-500 text-white shadow-sm', idle: 'bg-warm-50 text-warm-500 hover:bg-emerald-50 hover:text-emerald-600' },
  { key: 'media', label: 'Media', sel: 'bg-amber-400 text-white shadow-sm',   idle: 'bg-warm-50 text-warm-500 hover:bg-amber-50 hover:text-amber-600'   },
  { key: 'alta',  label: 'Alta',  sel: 'bg-red-500 text-white shadow-sm',     idle: 'bg-warm-50 text-warm-500 hover:bg-red-50 hover:text-red-600'       },
]

const AV_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
]

function initials(n) {
  return (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function TaskEditModal({ task, onClose, onSaved }) {
  const { profile } = useApp()
  const [form, setForm] = useState({
    title: task.title || '',
    type: task.task_type || task.type || 'task',
    priority: task.priority || 'media',
    due_date: task.due_date || '',
    urgent: task.urgent || false,
    assigned_to_id: task.assigned_to?.id || '',
  })
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const canReassign = profile?.role === 'admin' || profile?.role === 'manager'

  useEffect(() => {
    if (canReassign) api('/api/team/members').then(d => setMembers(d.members || [])).catch(() => {})
  }, [canReassign])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title: form.title,
        type: form.type,
        priority: form.priority,
        due_date: form.due_date || null,
        urgent: form.urgent,
      }
      if (canReassign) body.assigned_to_id = form.assigned_to_id || null
      const d = await api(`/api/tasks/${task.id}`, { method: 'PATCH', body })
      onSaved(d.task)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-warm-200"/>
        </div>

        {/* Header */}
        <div className="flex items-center px-6 pt-5 pb-3">
          <span className="flex-1 text-base font-700 text-warm-900">Modifica task</span>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 hover:bg-warm-200 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-warm-500">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        <form onSubmit={save} className="px-6 pb-7 space-y-5">

          {/* Titolo */}
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Descrizione del task..."
            required autoFocus
            className="w-full text-lg font-600 text-warm-900 bg-warm-50 rounded-2xl px-4 py-3.5 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-200 transition-all placeholder:text-warm-300 placeholder:font-400"
          />

          {/* Tipo */}
          <div>
            <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2.5">Tipo di attività</div>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.key} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.key }))}
                  className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl text-xs font-600 transition-all ${
                    form.type === t.key
                      ? 'bg-warm-900 text-white shadow-md scale-[1.02]'
                      : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                  }`}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priorità */}
          <div>
            <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2.5">Priorità</div>
            <div className="grid grid-cols-3 gap-2">
              {PRI_OPTIONS.map(p => (
                <button key={p.key} type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.key }))}
                  className={`py-3.5 rounded-2xl text-sm font-700 transition-all ${
                    form.priority === p.key ? p.sel : p.idle
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scadenza + Urgente */}
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2.5">Scadenza</div>
              <input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full text-sm bg-warm-50 rounded-2xl px-4 py-3.5 border-0 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all text-warm-700"/>
            </div>
            <div className="flex-shrink-0 self-end">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, urgent: !f.urgent }))}
                className={`px-4 py-3.5 rounded-2xl text-sm font-700 transition-all flex items-center gap-1.5 ${
                  form.urgent
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-warm-50 text-warm-400 hover:text-red-500 hover:bg-red-50'
                }`}>
                ⚡ Urgente
              </button>
            </div>
          </div>

          {/* Assegna a */}
          {canReassign && members.length > 0 && (
            <div>
              <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2.5">Assegna a</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m, i) => {
                  const sel = form.assigned_to_id === m.id
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setForm(f => ({ ...f, assigned_to_id: sel ? '' : m.id }))}
                      className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-600 transition-all ${
                        sel ? 'bg-warm-900 text-white shadow-sm' : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                      }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 ${
                        sel ? 'bg-white/20 text-white' : AV_COLORS[i % AV_COLORS.length]
                      }`}>
                        {initials(m.full_name)}
                      </div>
                      {m.full_name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Azioni */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-5 py-3.5 text-sm font-600 text-warm-500 bg-warm-50 hover:bg-warm-100 rounded-2xl transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex-1 bg-warm-900 hover:bg-warm-800 active:scale-[0.98] text-white text-sm font-700 rounded-2xl py-3.5 transition-all disabled:opacity-40 shadow-sm">
              {saving ? 'Salvo...' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
