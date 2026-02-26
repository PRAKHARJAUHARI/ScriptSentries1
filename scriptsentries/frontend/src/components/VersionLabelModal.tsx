// src/components/VersionLabelModal.tsx
import { useState } from 'react'
import { X, Tag, Loader2, Film, AlertTriangle, Check } from 'lucide-react'
import { assignScriptToProject, type ProjectResponse } from '../api/projectApi'
import { useAuth } from '../context/AuthContext'
import type { Script } from '../types'

interface Props {
  script: Script
  projects: ProjectResponse[]
  defaultProjectId: number          // always a valid number — never undefined
  onComplete: (versionName: string, projectId?: number) => void
  onSkip: () => void
}

const QUICK_LABELS = ['Draft 1', 'Draft 2', 'Revised Draft', "Director's Cut", 'Final', 'Locked']

export function VersionLabelModal({ script, projects, defaultProjectId, onComplete, onSkip }: Props) {
  const { user } = useAuth()
  const [versionName, setVersionName] = useState('')
  const [projectId,   setProjectId]   = useState<number>(defaultProjectId)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const risks     = script.risks ?? []
  const highCount = risks.filter(r => r.severity === 'HIGH').length
  const medCount  = risks.filter(r => r.severity === 'MEDIUM').length

  const handleSave = async () => {
    if (!versionName.trim()) { setError('Please enter a version label.'); return }
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await assignScriptToProject(script.id, projectId, versionName.trim(), user.userId)
      onComplete(versionName.trim(), projectId)
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to save version label.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40" onClick={onSkip} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl
                        shadow-xl pointer-events-auto overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200
                              flex items-center justify-center">
                <Tag size={16} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="font-display text-lg text-slate-900">Label This Version</h2>
                <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{script.filename}</p>
              </div>
            </div>
            <button onClick={onSkip}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="p-5 space-y-4">

            {/* Analysis summary */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-slate-600">Analysis complete</span>
              <div className="flex items-center gap-2 ml-auto">
                {highCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500
                                   border border-red-200 font-medium">
                    {highCount} HIGH
                  </span>
                )}
                {medCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600
                                   border border-amber-200 font-medium">
                    {medCount} MED
                  </span>
                )}
                {risks.length === 0 && (
                  <span className="text-[10px] text-slate-400">No risks flagged</span>
                )}
              </div>
            </div>

            {/* Project selector — only show if user has multiple projects */}
            {projects.length > 1 && (
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1.5 uppercase tracking-widest">
                  Project
                </label>
                <div className="relative">
                  <Film size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={projectId}
                    onChange={e => setProjectId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm
                               rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-400
                               focus:ring-2 focus:ring-emerald-100 appearance-none transition-all">
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Quick label chips */}
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-widest">
                Quick Label
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_LABELS.map(label => (
                  <button key={label} type="button" onClick={() => setVersionName(label)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      versionName === label
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom label input */}
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold mb-1.5 uppercase tracking-widest">
                Version Label *
              </label>
              <input
                type="text"
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Draft 1, Director's Cut…"
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm
                           rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400
                           focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !versionName.trim()}
              className="flex-1 btn-primary justify-center">
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : <><Tag size={14} /> Save Version</>}
            </button>
            <button onClick={onSkip} className="btn-ghost px-5">
              Skip
            </button>
          </div>
        </div>
      </div>
    </>
  )
}