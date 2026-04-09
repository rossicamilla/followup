import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'

const TYPES = ['task', 'chiamata', 'email', 'meeting']
const PRIORITIES = ['bassa', 'media', 'alta']

export default function TaskEditModal({ task, onClose, onSaved }) {
  const { profile } = useApp()
  const [form, setForm] = useState({
    title: task.title || '',
    type: task.type || 'task',
    priority: task.priority || 'media',
    due_date: task.due_date || '',
    urgent: task.urgent || false,
    assigned_to_id: task.assigned_to?.id || task.assigned_to || ''
  })
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)

  const canReassign = profile?.role === 'admin' || profile?.role === 'manager'

  useEffect(() => {
    if (canReassign) {
      api('/api/team/members').then(d => setMembers(d.members || [])).catch(() => {})
    }
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
      if (canReassign && form.assigned_to_id) {
        body.assigned_to_id = form.assigned_to_id
      }
      const d = await api(`/api/tasks/${task.id}`, { method: 'PATCH', body })
      onSaved(d.task)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100">
          <div className="flex-1 font-700 text-warm-900 text-sm">Modifica task</div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          {/* Titolo */}
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Titolo *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo */}
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 capitalize">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Priorità */}
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Priorità</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 capitalize">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Scadenza */}
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Scadenza</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>

          {/* Urgente */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, urgent: !f.urgent }))}
              className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${form.urgent ? 'bg-red-500' : 'bg-warm-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.urgent ? 'left-4' : 'left-0.5'}`}/>
            </div>
            <span className="text-sm text-warm-700">⚡ Urgente</span>
          </label>

          {/* Assegna a (solo admin/manager) */}
          {canReassign && members.length > 0 && (
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Assegna a</label>
              <select
                value={form.assigned_to_id}
                onChange={e => setForm(f => ({ ...f, assigned_to_id: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"
              >
                <option value="">— Seleziona —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="text-sm text-warm-500 hover:text-warm-700 font-500 border border-warm-200 rounded-xl px-4 py-2 transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl py-2 transition-colors disabled:opacity-40">
              {saving ? 'Salvo...' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
