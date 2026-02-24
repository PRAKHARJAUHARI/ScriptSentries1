import type { ClearanceStatus } from '../types'

interface Props {
  value: ClearanceStatus
  onChange: (status: ClearanceStatus) => void
  disabled?: boolean
}

const STATUS_CONFIG: Record<ClearanceStatus, { label: string; color: string; bg: string }> = {
  PENDING:                 { label: 'Pending',               color: 'text-slate-400',   bg: 'bg-slate-700/60' },
  CLEARED:                 { label: 'Cleared',               color: 'text-jade-400',    bg: 'bg-jade-900/40' },
  NOT_CLEAR:               { label: 'Not Clear',             color: 'text-crimson-400', bg: 'bg-crimson-900/40' },
  NEGOTIATED_BY_ATTORNEY:  { label: 'Negotiated',            color: 'text-purple-400',  bg: 'bg-purple-900/40' },
  BRANDED_INTEGRATION:     { label: 'Branded Integration',   color: 'text-blue-400',    bg: 'bg-blue-900/40' },
  NO_CLEARANCE_NECESSARY:  { label: 'No Clearance Needed',   color: 'text-teal-400',    bg: 'bg-teal-900/40' },
  PERMISSIBLE:             { label: 'Permissible',           color: 'text-lime-400',    bg: 'bg-lime-900/40' },
}

export const STATUS_OPTIONS: ClearanceStatus[] = [
  'PENDING', 'CLEARED', 'NOT_CLEAR', 'NEGOTIATED_BY_ATTORNEY',
  'BRANDED_INTEGRATION', 'NO_CLEARANCE_NECESSARY', 'PERMISSIBLE',
]

export function StatusBadge({ status }: { status: ClearanceStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`badge ${cfg.bg} ${cfg.color} border border-current/20`}>
      {cfg.label}
    </span>
  )
}

export function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ClearanceStatus)}
      className="w-full bg-obsidian-900 border border-white/10 text-slate-200
                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-jade-500
                 focus:ring-1 focus:ring-jade-500/50 disabled:opacity-50 transition-colors"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {STATUS_CONFIG[s].label}
        </option>
      ))}
    </select>
  )
}
