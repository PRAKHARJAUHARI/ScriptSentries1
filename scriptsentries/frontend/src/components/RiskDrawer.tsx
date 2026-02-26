// src/components/RiskDrawer.tsx
import { useState, useEffect, useRef } from 'react'
import {
  X, AlertTriangle, AlertCircle, Info,
  FileText, Lightbulb, MessageSquare, Lock, Save, Loader2, CheckCircle2, AtSign
} from 'lucide-react'
import type { RiskFlag, ClearanceStatus } from '../types'
import { updateRisk } from '../api/api'
import { useAuth } from '../context/AuthContext'

interface Props {
  risk: RiskFlag | null
  onClose: () => void
  onUpdated: (updated: RiskFlag) => void
}

const SEVERITY = {
  HIGH:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    icon: AlertTriangle },
  MEDIUM: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-600',  icon: AlertCircle   },
  LOW:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: Info          },
}

const STATUSES: { value: ClearanceStatus; label: string; color: string }[] = [
  { value: 'PENDING',                   label: 'Pending',                 color: 'bg-amber-50 text-amber-700 border-amber-200'     },
  { value: 'NOT_CLEAR',                 label: 'Not Clear',               color: 'bg-red-50 text-red-600 border-red-200'           },
  { value: 'CLEARED',                   label: 'Cleared',                 color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'NEGOTIATED_BY_ATTORNEY',    label: 'Negotiated',              color: 'bg-blue-50 text-blue-700 border-blue-200'        },
  { value: 'BRANDED_INTEGRATION',       label: 'Branded Integration',     color: 'bg-violet-50 text-violet-700 border-violet-200'  },
  { value: 'NO_CLEARANCE_NECESSARY',    label: 'No Clearance Necessary',  color: 'bg-slate-50 text-slate-600 border-slate-200'     },
  { value: 'PERMISSIBLE',               label: 'Permissible',             color: 'bg-indigo-50 text-indigo-700 border-indigo-200'  },
]

// Tagging-aware textarea component
interface TaggingTextareaProps {
  value: string
  onChange: (v: string) => void
  placeholder: string
  rows?: number
  disabled?: boolean
}

function TaggingTextarea({ value, onChange, placeholder, rows = 3, disabled }: TaggingTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [showHint, setShowHint] = useState(false)

  const handleKeyUp = () => {
    if (!ref.current) return
    const pos = ref.current.selectionStart
    const before = value.slice(0, pos)
    const lastAt = before.lastIndexOf('@')
    if (lastAt !== -1 && lastAt > before.lastIndexOf(' ')) {
      setShowHint(true)
    } else {
      setShowHint(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    handleKeyUp()
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        onBlur={() => setTimeout(() => setShowHint(false), 200)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 text-slate-800 text-sm
                   rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400
                   focus:ring-2 focus:ring-emerald-100 placeholder-slate-300
                   resize-none transition-all disabled:opacity-50"
      />
      {showHint && (
        <div className="absolute bottom-full left-0 mb-1 px-2.5 py-1.5 bg-slate-800 text-white
                        text-[11px] rounded-lg shadow-lg flex items-center gap-1.5">
          <AtSign size={10} />
          Type a username to tag a teammate
        </div>
      )}
    </div>
  )
}

export function RiskDrawer({ risk, onClose, onUpdated }: Props) {
  const { user } = useAuth()

  const [status,       setStatus]       = useState<ClearanceStatus>('PENDING')
  const [comments,     setComments]     = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saveState,    setSaveState]    = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // canEdit: attorneys and analysts can change status; all except viewers can comment
  const canEditStatus = user ? ['ATTORNEY', 'ANALYST'].includes(user.role) : false
  const canComment    = user ? !['VIEWER'].includes(user.role) : false

  useEffect(() => {
    if (risk) {
      setStatus(risk.status)
      setComments(risk.comments ?? '')
      setRestrictions(risk.restrictions ?? '')
      setSaveState('idle')
    }
  }, [risk])

  if (!risk) return null

  const sev  = SEVERITY[risk.severity]
  const Icon = sev.icon

  const handleSave = async () => {
    if (!canComment && !canEditStatus) return
    setSaving(true)
    setSaveState('saving')
    try {
      const payload: Parameters<typeof updateRisk>[1] = {}

      // Only include status if user can edit it
      if (canEditStatus) payload.status = status

      // Always include comments/restrictions if user can comment
      if (canComment) {
        payload.comments     = comments
        payload.restrictions = restrictions
      }

      const updated = await updateRisk(risk.id, payload)
      onUpdated(updated)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (e) {
      console.error('Save failed', e)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const currentStatusStyle = STATUSES.find(s => s.value === status)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200
                        shadow-2xl z-50 flex flex-col animate-slide-in overflow-hidden">

        {/* Header */}
        <div className={`flex items-start justify-between p-5 border-b border-slate-100 ${sev.bg}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${sev.bg} border ${sev.border} mt-0.5`}>
              <Icon size={16} className={sev.text} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sev.bg} ${sev.border} ${sev.text}`}>
                  {risk.severity}
                </span>
                <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  Page {risk.pageNumber}
                </span>
                <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {risk.category.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="font-semibold text-slate-900 mt-2 text-base leading-tight">
                {risk.entityName}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/80 rounded-xl transition-colors flex-shrink-0 ml-2">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Script excerpt */}
          {risk.snippet && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4
                            border-l-4 border-l-emerald-400">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                <FileText size={10} /> Script excerpt
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-mono">"{risk.snippet}"</p>
            </div>
          )}

          {/* AI reason */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
              <AlertTriangle size={10} /> Why this was flagged
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{risk.reason}</p>
          </div>

          {/* AI suggestion */}
          {risk.suggestion && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-2">
                <Lightbulb size={10} /> Suggested fix
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">{risk.suggestion}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attorney Workspace</p>

            {/* Status */}
            {canEditStatus ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Clearance Status</label>
                <div className="grid gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs
                                  font-medium transition-all ${
                        status === s.value
                          ? s.color + ' ring-2 ring-offset-1 ring-emerald-300 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        status === s.value ? 'ring-2 ring-current ring-offset-1' : 'bg-slate-300'
                      }`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Clearance Status</label>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${currentStatusStyle?.color}`}>
                  {currentStatusStyle?.label}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Only Attorneys and Analysts can change status.</p>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <MessageSquare size={11} /> Comments
                <span className="text-[10px] text-slate-400 font-normal ml-1">(@tag teammates)</span>
              </label>
              <TaggingTextarea
                value={comments}
                onChange={setComments}
                placeholder="Add clearance notes… @username to tag"
                rows={3}
                disabled={!canComment}
              />
              {!canComment && (
                <p className="text-[10px] text-slate-400 mt-1">Viewers cannot add comments.</p>
              )}
            </div>

            {/* Restrictions */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Lock size={11} /> Restrictions / Conditions
                <span className="text-[10px] text-slate-400 font-normal ml-1">(@tag teammates)</span>
              </label>
              <TaggingTextarea
                value={restrictions}
                onChange={setRestrictions}
                placeholder="e.g. 'US only' · 'Must blur in theatrical' · @attorney review"
                rows={2}
                disabled={!canComment}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || (!canComment && !canEditStatus)}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
                        text-sm font-medium transition-all border
                        ${saveState === 'saved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : saveState === 'error'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                        }
                        disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}>
            {saveState === 'saving' && <><Loader2 size={14} className="animate-spin" /> Saving…</>}
            {saveState === 'saved'  && <><CheckCircle2 size={14} /> Saved</>}
            {saveState === 'error'  && <><AlertTriangle size={14} /> Save failed</>}
            {saveState === 'idle'   && <><Save size={14} /> Save Changes</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800
                                               border border-slate-200 bg-white rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </aside>
    </>
  )
}