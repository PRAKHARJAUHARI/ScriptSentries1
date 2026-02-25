// src/components/Timeline.tsx
import { useState, useEffect } from 'react'
import {
  GitBranch, AlertTriangle, Loader2, Trash2, Edit3,
  Check, X, ExternalLink, Clock, AlertCircle
} from 'lucide-react'
import { getProjectTimeline, renameVersion, deleteScript, type TimelineEntry } from '../api/projectApi'
import { useAuth, canUpload } from '../context/AuthContext'

interface Props {
  projectId: number
  onOpenScript: (scriptId: number) => void
}

export function Timeline({ projectId, onOpenScript }: Props) {
  const { user } = useAuth()
  const [entries,  setEntries]  = useState<TimelineEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [editLabel,   setEditLabel]   = useState('')
  const [renamingSaving, setRenamingSaving] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting,  setDeleting]  = useState(false)

  const canManage = user ? canUpload(user.role) : false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getProjectTimeline(projectId)
      .then(t => { if (!cancelled) setEntries(t.versions) })
      .catch(() => { if (!cancelled) setError('Failed to load timeline.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [projectId])

  const handleRename = async (scriptId: number) => {
    if (!editLabel.trim() || !user) return
    setRenamingSaving(true)
    try {
      await renameVersion(scriptId, editLabel.trim(), user.userId)
      setEntries(prev => prev.map(e =>
        e.scriptId === scriptId ? { ...e, versionName: editLabel.trim() } : e
      ))
      setEditingId(null)
    } catch { /* ignore */ }
    finally { setRenamingSaving(false) }
  }

  const handleDelete = async (scriptId: number) => {
    if (!user) return
    setDeleting(true)
    try {
      await deleteScript(scriptId, user.userId)
      setEntries(prev => prev.map(e =>
        e.scriptId === scriptId ? { ...e, deletedAt: new Date().toISOString() } : e
      ))
      setConfirmDeleteId(null)
    } catch { /* ignore */ }
    finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
        <Loader2 size={14} className="animate-spin" /> Loading timeline…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm py-6 bg-red-50 rounded-xl px-4 border border-red-100">
        <AlertCircle size={14} /> {error}
      </div>
    )
  }

  const active = entries.filter(e => !e.deletedAt)

  if (active.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
        <GitBranch size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium text-sm">No script versions yet</p>
        <p className="text-slate-400 text-xs mt-1">Click <strong>Upload New Script</strong> above to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {active.map((entry, i) => (
        <div key={entry.scriptId} className="flex gap-4">
          {/* Timeline spine */}
          <div className="flex flex-col items-center w-6 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm mt-4 flex-shrink-0 ${
              entry.status === 'COMPLETE' ? 'bg-emerald-500 ring-2 ring-emerald-200'
              : entry.status === 'FAILED' ? 'bg-red-500 ring-2 ring-red-200'
              : 'bg-amber-400 ring-2 ring-amber-200'
            }`} />
            {i < active.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 mt-1" />
            )}
          </div>

          {/* Card */}
          <div className={`flex-1 mb-4 rounded-2xl border p-4 transition-all ${
            i === 0
              ? 'bg-white border-emerald-200 shadow-sm'
              : 'bg-white border-slate-200'
          }`}>

            {/* Confirm delete overlay */}
            {confirmDeleteId === entry.scriptId ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 mb-3">
                  Remove "{entry.versionName}" from timeline?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(entry.scriptId)}
                    disabled={deleting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5
                               bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all">
                    {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    Delete
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 text-xs py-1.5 border border-red-200 text-red-600
                               rounded-lg hover:bg-red-100 transition-all font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  {editingId === entry.scriptId ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(entry.scriptId)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="flex-1 bg-white border border-emerald-400 ring-2 ring-emerald-100
                                   text-slate-800 text-sm rounded-lg px-3 py-1 focus:outline-none"
                      />
                      <button onClick={() => handleRename(entry.scriptId)}
                        disabled={renamingSaving || !editLabel.trim()}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg
                                   disabled:opacity-40 transition-all">
                        {renamingSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-all">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm truncate">{entry.versionName}</h3>
                      {i === 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700
                                         rounded font-bold uppercase tracking-wider flex-shrink-0">Latest</span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => { setEditingId(entry.scriptId); setEditLabel(entry.versionName) }}
                          className="p-1 hover:bg-slate-100 text-slate-300 hover:text-slate-600
                                     rounded-lg transition-all flex-shrink-0">
                          <Edit3 size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      entry.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : entry.status === 'FAILED' ? 'bg-red-50 text-red-500 border-red-200'
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>{entry.status}</span>
                    {canManage && (
                      <button
                        onClick={() => setConfirmDeleteId(entry.scriptId)}
                        className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-400
                                   rounded-lg transition-all">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Risk counts */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {entry.highCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
                                     bg-red-50 text-red-500 border border-red-100 font-medium">
                      <AlertTriangle size={8} /> {entry.highCount} HIGH
                    </span>
                  )}
                  {entry.mediumCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600
                                     border border-amber-100 font-medium">
                      {entry.mediumCount} MED
                    </span>
                  )}
                  {entry.lowCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600
                                     border border-emerald-100 font-medium">
                      {entry.lowCount} LOW
                    </span>
                  )}
                  {entry.totalRisks === 0 && (
                    <span className="text-[10px] text-slate-400">No risks flagged</span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(entry.uploadedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {entry.uploadedBy && (
                      <span>by @{entry.uploadedBy.username}</span>
                    )}
                    <span>{entry.totalPages} pages</span>
                  </div>

                  {entry.status === 'COMPLETE' && (
                    <button
                      onClick={() => onOpenScript(entry.scriptId)}
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-600
                                 hover:text-emerald-700 font-medium transition-colors">
                      Open <ExternalLink size={9} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}