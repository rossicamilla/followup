import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'

const TYPE_OPTIONS = [
  { key: 'task',     label: 'Task'     },
  { key: 'chiamata', label: 'Chiamata' },
  { key: 'email',    label: 'Email'    },
  { key: 'meeting',  label: 'Meeting'  },
]
const PRI_OPTIONS = [
  { key: 'bassa', label: 'Bassa', sel: 'bg-emerald-500 text-white', idle: 'bg-warm-100 text-warm-500 hover:bg-emerald-50 hover:text-emerald-600' },
  { key: 'media', label: 'Media', sel: 'bg-amber-400 text-white',   idle: 'bg-warm-100 text-warm-500 hover:bg-amber-50 hover:text-amber-600'   },
  { key: 'alta',  label: 'Alta',  sel: 'bg-red-500 text-white',     idle: 'bg-warm-100 text-warm-500 hover:bg-red-50 hover:text-red-600'       },
]
const AV_COLORS = [
  'bg-blue-100 text-blue-700','bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700','bg-sky-100 text-sky-700',
]
function initials(n) { return (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }

function detectLinkType(task) {
  if (task.opportunity_id || task.opportunity) return 'vendita'
  if (task.project_id || task.project) return 'progetto'
  return 'nessuno'
}

export default function TaskEditModal({ task, onClose, onSaved }) {
  const { profile } = useApp()
  const canReassign = profile?.role === 'admin' || profile?.role === 'manager'

  const [form, setForm] = useState({
    title:          task.title || '',
    type:           task.task_type || task.type || 'task',
    priority:       task.priority || 'media',
    due_date:       task.due_date || '',
    urgent:         task.urgent || false,
    notes:          task.notes || '',
    assigned_to_id: task.assigned_to?.id || '',
    project_id:     task.project_id || '',
    opportunity_id: task.opportunity_id || '',
  })
  const [linkType, setLinkType] = useState(detectLinkType(task))
  const [members, setMembers]   = useState([])
  const [projects, setProjects] = useState([])
  const [opps, setOpps]         = useState([])
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (canReassign) api('/api/team/members').then(d => setMembers(d.members||[])).catch(()=>{})
    api('/api/projects').then(d => setProjects(d.projects||[])).catch(()=>{})
    api('/api/pipeline').then(d => setOpps(d.pipeline||[])).catch(()=>{})
  }, [])

  function changeLinkType(t) {
    setLinkType(t)
    if (t === 'nessuno')  setForm(f => ({ ...f, project_id: '', opportunity_id: '' }))
    if (t === 'progetto') setForm(f => ({ ...f, opportunity_id: '' }))
    if (t === 'vendita')  setForm(f => ({ ...f, project_id: '' }))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title:          form.title,
        type:           form.type,
        priority:       form.priority,
        due_date:       form.due_date || null,
        urgent:         form.urgent,
        notes:          form.notes || null,
        project_id:     linkType === 'progetto' ? (form.project_id || null) : null,
        opportunity_id: linkType === 'vendita'  ? (form.opportunity_id || null) : null,
      }
      if (canReassign) body.assigned_to_id = form.assigned_to_id || null
      const d = await api(`/api/tasks/${task.id}`, { method: 'PATCH', body })
      onSaved(d.task)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const linkedProject = task.project || projects.find(p => p.id === form.project_id)
  const linkedOpp     = task.opportunity || opps.find(o => o.id === form.opportunity_id)
  const createdDate   = task.created_at
    ? new Date(task.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-warm-200"/>
        </div>

        {/* Header */}
        <div className="flex items-center px-6 pt-5 pb-3 flex-shrink-0 border-b border-warm-100">
          <span className="flex-1 text-sm font-600 text-warm-400">Modifica task</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 hover:bg-warm-200 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-warm-500"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>

        {/* Body scrollabile */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <form id="edit-task-form" onSubmit={save}>
            <div className="flex flex-col md:flex-row">

              {/* Colonna sinistra: titolo + tipo + obiettivo */}
              <div className="flex-1 px-6 py-5 md:border-r border-warm-100">

                {/* Titolo */}
                <textarea
                  value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="Titolo del task..."
                  required rows={2}
                  className="w-full text-xl font-600 text-warm-900 border-0 focus:outline-none placeholder:text-warm-300 placeholder:font-400 bg-transparent resize-none leading-snug"
                />

                {/* Assegnato a */}
                {canReassign && members.length > 0 && (
                  <div className="mt-4">
                    <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-1.5">Assegnato a</div>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m, i) => {
                        const sel = form.assigned_to_id === m.id
                        return (
                          <button key={m.id} type="button"
                            onClick={() => setForm(f=>({...f,assigned_to_id: sel ? '' : m.id}))}
                            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-600 transition-all ${
                              sel ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 border border-warm-200 hover:border-warm-300'
                            }`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-700 flex-shrink-0 ${sel ? 'bg-white/20 text-white' : AV_COLORS[i%AV_COLORS.length]}`}>
                              {initials(m.full_name)}
                            </div>
                            {m.full_name.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Tipo */}
                <div className="mt-5">
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2">Tipo</div>
                  <div className="flex gap-2 flex-wrap">
                    {TYPE_OPTIONS.map(t => (
                      <button key={t.key} type="button"
                        onClick={() => setForm(f => ({...f, type: t.key}))}
                        className={`px-3.5 py-2 rounded-xl text-xs font-600 transition-all ${
                          form.type === t.key ? 'bg-warm-900 text-white shadow-sm' : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Obiettivo collegato */}
                <div className="mt-5">
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2">Obiettivo collegato</div>
                  <div className="flex gap-2 mb-2.5">
                    {[{k:'nessuno',l:'Nessuno'},{k:'progetto',l:'📦 Progetto'},{k:'vendita',l:'🎯 Vendita'}].map(({k,l}) => (
                      <button key={k} type="button" onClick={() => changeLinkType(k)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-600 transition-all flex-1 ${
                          linkType === k ? 'bg-warm-900 text-white' : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                        }`}>{l}</button>
                    ))}
                  </div>

                  {linkType === 'progetto' && (
                    <>
                      <select value={form.project_id} onChange={e => setForm(f=>({...f,project_id:e.target.value}))}
                        className="w-full text-sm bg-warm-50 rounded-xl px-3 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-brand-200 text-warm-700">
                        <option value="">Seleziona progetto...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {linkedProject?.name && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <span className="text-base flex-shrink-0">📦</span>
                          <div className="min-w-0">
                            <div className="text-xs font-700 text-blue-900 truncate">{linkedProject.name}</div>
                            <div className="text-2xs text-blue-500">Progetto</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {linkType === 'vendita' && (
                    <>
                      <select value={form.opportunity_id} onChange={e => setForm(f=>({...f,opportunity_id:e.target.value}))}
                        className="w-full text-sm bg-warm-50 rounded-xl px-3 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-brand-200 text-warm-700">
                        <option value="">Seleziona opportunità...</option>
                        {opps.filter(o=>o.stage!=='chiuso').map(o => (
                          <option key={o.id} value={o.id}>{o.contact?.name||o.contact_name}{o.project?.name?` — ${o.project.name}`:''}</option>
                        ))}
                      </select>
                      {linkedOpp && (
                        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <span className="text-base flex-shrink-0">🎯</span>
                          <div className="min-w-0">
                            <div className="text-xs font-700 text-emerald-900 truncate">{linkedOpp.contact?.name||linkedOpp.contact_name}</div>
                            <div className="text-2xs text-emerald-600">{linkedOpp.project?.name||'—'} · {linkedOpp.stage}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Note */}
                <div className="mt-5">
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-2">Note</div>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    placeholder="Aggiungi note interne..."
                    rows={3}
                    className="w-full text-sm bg-warm-50 rounded-xl px-3 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-brand-200 text-warm-700 placeholder:text-warm-300 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Colonna destra: sidebar metadata */}
              <div className="md:w-56 px-6 md:px-5 py-5 space-y-5 border-t md:border-t-0 border-warm-100 bg-warm-50/40">

                {/* Creato */}
                {createdDate && (
                  <div>
                    <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-1">Creato</div>
                    <div className="text-xs text-warm-600">{createdDate}</div>
                  </div>
                )}

                {/* Scadenza */}
                <div>
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-1.5">Scadenza</div>
                  <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))}
                    className="w-full text-sm bg-white rounded-xl px-3 py-2 border border-warm-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 text-warm-700"/>
                </div>

                {/* Priorità */}
                <div>
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest mb-1.5">Priorità</div>
                  <div className="flex gap-1.5">
                    {PRI_OPTIONS.map(p => (
                      <button key={p.key} type="button" onClick={() => setForm(f=>({...f,priority:p.key}))}
                        className={`flex-1 py-2 rounded-xl text-xs font-700 transition-all ${form.priority===p.key ? p.sel : p.idle}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgente */}
                <div className="flex items-center justify-between">
                  <div className="text-2xs font-700 text-warm-400 uppercase tracking-widest">⚡ Urgente</div>
                  <button type="button" onClick={() => setForm(f=>({...f,urgent:!f.urgent}))}
                    className={`w-10 rounded-full relative transition-colors flex-shrink-0 ${form.urgent ? 'bg-red-500' : 'bg-warm-200'}`}
                    style={{height:'22px'}}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.urgent ? 'left-5' : 'left-0.5'}`}/>
                  </button>
                </div>

              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-warm-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-600 text-warm-500 bg-warm-50 hover:bg-warm-100 rounded-2xl transition-colors">
            Annulla
          </button>
          <button type="submit" form="edit-task-form" disabled={saving || !form.title.trim()}
            className="flex-1 bg-warm-900 hover:bg-warm-800 active:scale-[0.99] text-white text-sm font-700 rounded-2xl py-2.5 transition-all disabled:opacity-40 shadow-sm">
            {saving ? 'Salvo...' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  )
}
