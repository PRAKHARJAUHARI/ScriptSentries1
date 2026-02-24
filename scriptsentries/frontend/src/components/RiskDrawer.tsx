// src/components/RiskDrawer.tsx
import { useState, useEffect } from 'react'
import {
  X, AlertTriangle, AlertCircle, Info,
  FileText, Lightbulb, MessageSquare, Lock, Save, Loader2
} from 'lucide-react'
import type { RiskFlag, ClearanceStatus } from '../types'
import { updateRisk } from '../api/api'
import { StatusSelect } from './StatusSelect'

interface Props {
  risk: RiskFlag | null
  onClose: () => void
  onUpdated: (updated: RiskFlag) => void
}

const SEVERITY_COLORS = {
  HIGH:   { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-600',    icon: AlertTriangle },
  MEDIUM: { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-600',  icon: AlertCircle   },
  LOW:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: Info          },
}

export function RiskDrawer({ risk, onClose, onUpdated }: Props) {
  const [status,       setStatus]       = useState<ClearanceStatus>('PENDING')
  const [comments,     setComments]     = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    if (risk) {
      setStatus(risk.status)
      setComments(risk.comments ?? '')
      setRestrictions(risk.restrictions ?? '')
      setSaved(false)
    }
  }, [risk])

  if (!risk) return null

  const sev  = SEVERITY_COLORS[risk.severity]
  const Icon = sev.icon

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateRisk(risk.id, { status, comments, restrictions })
      onUpdated(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-xl bg-white border-l border-slate-200
                        z-50 flex flex-col shadow-2xl animate-slide-in overflow-hidden">

        {/* Header */}
        <div className={`flex items-start justify-between p-5 border-b border-slate-100 ${sev.bg}`}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${sev.bg} border ${sev.border} mt-0.5 flex-shrink-0`}>
              <Icon size={16} className={sev.text} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`badge ${sev.bg} ${sev.text} border ${sev.border} font-semibold`}>
                  {risk.severity}
                </span>
                <span className="badge bg-slate-100 text-slate-500 border border-slate-200">
                  {risk.category.replace(/_/g, ' ')}
                </span>
                <span className="badge bg-slate-100 text-slate-400 border border-slate-200 font-mono">
                  pg. {risk.pageNumber}
                </span>
              </div>
              <h2 className="font-display text-lg text-slate-900 truncate">{risk.entityName}</h2>
              <p className="text-slate-400 text-xs">{risk.subCategory.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-2 flex-shrink-0">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Script Excerpt */}
          {risk.snippet && (
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <FileText size={12} /> Script Excerpt
              </h3>
              <blockquote className="bg-slate-50 border-l-2 border-emerald-400 px-4 py-3 rounded-r-lg
                                     font-mono text-sm text-slate-600 leading-relaxed">
                "{risk.snippet}"
              </blockquote>
            </section>
          )}

          {/* Legal Reason */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <AlertTriangle size={12} /> Legal Reason
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
              {risk.reason}
            </p>
          </section>

          {/* AI Suggestion */}
          {risk.suggestion && (
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <Lightbulb size={12} /> AI Suggestion
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                {risk.suggestion}
              </p>
            </section>
          )}

          {/* Attorney workspace */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">
              Attorney Workspace
            </p>

            {/* Clearance Status */}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Clearance Status</label>
              <StatusSelect value={status} onChange={setStatus} />
            </div>

            {/* Comments */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
                <MessageSquare size={11} /> Comments
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                rows={3}
                placeholder="Add clearance notes, contact info, negotiation status…"
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-400
                           focus:ring-2 focus:ring-emerald-100 placeholder-slate-300
                           resize-none transition-colors"
              />
            </div>

            {/* Restrictions */}
            <div className="mb-5">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
                <Lock size={11} /> Restrictions / Conditions
              </label>
              <textarea
                value={restrictions}
                onChange={e => setRestrictions(e.target.value)}
                rows={2}
                placeholder="e.g. 'Approved for US only', 'Must blur in theatrical release'…"
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-400
                           focus:ring-2 focus:ring-emerald-100 placeholder-slate-300
                           resize-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : saved ? (
              <><span>✓</span> Saved</>
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
          <button onClick={onClose} className="btn-ghost px-4">
            Cancel
          </button>
        </div>
      </aside>
    </>
  )
}
