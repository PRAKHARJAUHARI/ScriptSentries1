// src/components/ManageMembersModal.tsx
import { useState } from 'react'
import {
  X, Plus, Trash2, Loader2, Users, Crown, Search,
  Shield, Eye, Phone, Clapperboard, AlertTriangle
} from 'lucide-react'
import {
  addProjectMember, removeProjectMember,
  type ProjectResponse, type MemberResponse, type ProjectRole
} from '../api/projectApi'
import { searchUsers } from '../api/authApi'
import type { UserSummary } from '../api/authApi'
import { useAuth, canManageMembers, canAddViewer } from '../context/AuthContext'

interface Props {
  project: ProjectResponse
  onClose: () => void
  onUpdated: (project: ProjectResponse) => void
}

const ROLE_CONFIG: Record<ProjectRole, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  ATTORNEY:                { label: 'Attorney',             desc: 'Full access + finalize',     icon: Crown,       color: 'text-purple-400 bg-purple-950/50 border-purple-900/40' },
  ANALYST:                 { label: 'Analyst',              desc: 'Edit, flag, comment',         icon: Shield,      color: 'text-blue-400   bg-blue-950/50   border-blue-900/40'   },
  MAIN_PRODUCTION_CONTACT: { label: 'Prod. Contact',        desc: 'View + rename versions',      icon: Phone,       color: 'text-amber-400  bg-amber-950/50  border-amber-900/40'  },
  PRODUCTION_ASSISTANT:    { label: 'Prod. Assistant',      desc: 'View only',                   icon: Clapperboard,color: 'text-slate-400  bg-slate-800/50  border-slate-700/40'  },
  VIEWER:                  { label: 'Viewer',               desc: 'Read-only, no uploads',       icon: Eye,         color: 'text-zinc-400   bg-zinc-900/50   border-zinc-800/40'   },
}

function RoleBadge({ role }: { role: ProjectRole }) {
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border font-medium ${cfg.color}`}>
      <Icon size={9} /> {cfg.label}
    </span>
  )
}

export function ManageMembersModal({ project, onClose, onUpdated }: Props) {
  const { user }        = useAuth()
  const userRole        = user?.role ?? 'VIEWER'
  const userCanManage   = canManageMembers(userRole)
  const userCanAddViewer= canAddViewer(userRole)

  const [members,       setMembers]       = useState<MemberResponse[]>(project.members)
  const [searchQ,       setSearchQ]       = useState('')
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [selectedRole,  setSelectedRole]  = useState<ProjectRole>('ANALYST')
  const [removing,      setRemoving]      = useState<number | null>(null)
  const [adding,        setAdding]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const handleSearch = async (q: string) => {
    setSearchQ(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const results = await searchUsers(q)
      setSearchResults(results.filter(r =>
        r.id !== user?.userId && !members.find(m => m.user.id === r.id)
      ))
    } catch { setSearchResults([]) }
  }

  const handleAdd = async (u: UserSummary) => {
    if (!user) return
    setError(null)
    setAdding(true)
    setSearchQ('')
    setSearchResults([])
    try {
      const newMember = await addProjectMember(
        project.id,
        { userId: u.id, projectRole: selectedRole },
        user.userId
      )
      const updated = [...members, newMember]
      setMembers(updated)
      onUpdated({ ...project, members: updated })
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (memberId: number, userId: number) => {
    if (!user) return
    setError(null)
    setRemoving(memberId)
    try {
      await removeProjectMember(project.id, userId, user.userId)
      const updated = members.filter(m => m.id !== memberId)
      setMembers(updated)
      onUpdated({ ...project, members: updated })
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to remove member')
    } finally {
      setRemoving(null)
    }
  }

  // Roles available for adding — VIEWERs only if user has canAddViewer permission
  const availableRoles = Object.entries(ROLE_CONFIG).filter(([role]) =>
    role !== 'VIEWER' || userCanAddViewer
  ) as [ProjectRole, typeof ROLE_CONFIG[ProjectRole]][]

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-[#070c11] border border-white/[0.08] rounded-2xl
                        shadow-2xl pointer-events-auto animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-jade-700/20 border border-jade-700/30
                              flex items-center justify-center">
                <Users size={15} className="text-jade-400" />
              </div>
              <div>
                <h2 className="font-display text-lg text-white">Manage Members</h2>
                <p className="text-[11px] text-slate-600">{project.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/[0.07] rounded-xl transition-colors">
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">

            {/* Add member (only if user can manage) */}
            {userCanManage && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Add Member</p>

                {/* Role selector */}
                <div className="grid grid-cols-5 gap-1.5">
                  {availableRoles.map(([role, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button key={role} type="button"
                        onClick={() => setSelectedRole(role)}
                        title={cfg.desc}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border
                                    transition-all text-center ${
                          selectedRole === role
                            ? 'border-jade-600/50 bg-jade-950/40 text-jade-300'
                            : 'border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-400'
                        }`}>
                        <Icon size={12} />
                        <span className="text-[9px] font-medium leading-tight">{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* VIEWER warning */}
                {selectedRole === 'VIEWER' && (
                  <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800/40
                                  rounded-xl px-3 py-2">
                    <Eye size={12} className="text-zinc-500 flex-shrink-0" />
                    <p className="text-[10px] text-zinc-500">
                      VIEWER gets read-only access. Cannot upload, edit, or comment.
                    </p>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700" />
                  <input type="text" value={searchQ} onChange={e => handleSearch(e.target.value)}
                    placeholder="Search username to add..."
                    className="w-full bg-white/[0.03] border border-white/[0.07] text-white text-sm
                               rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-jade-600/50
                               placeholder-slate-700 transition-all" />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a1018] border
                                    border-white/[0.1] rounded-xl shadow-xl z-10 overflow-hidden">
                      {searchResults.map(u => (
                        <button key={u.id} type="button"
                          onClick={() => handleAdd(u)}
                          disabled={adding}
                          className="w-full flex items-center gap-3 px-4 py-2.5
                                     hover:bg-white/[0.05] transition-colors text-left disabled:opacity-50">
                          <div className="w-6 h-6 rounded-full bg-white/[0.05] border border-white/[0.08]
                                          flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">@{u.username}</p>
                            <p className="text-[10px] text-slate-600 truncate">{u.email}</p>
                          </div>
                          {adding
                            ? <Loader2 size={12} className="animate-spin text-jade-600 flex-shrink-0" />
                            : <Plus size={12} className="text-jade-600 flex-shrink-0" />
                          }
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/30
                              rounded-xl px-4 py-3">
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Member list */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                Current Members ({members.length})
              </p>
              {members.map(m => {
                const isCreator = project.createdBy?.id === m.user.id
                const isSelf    = user?.userId === m.user.id
                const canRemove = userCanManage && !isCreator && !isSelf

                return (
                  <div key={m.id}
                    className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06]
                               rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-jade-900/40 border border-jade-800/40
                                    flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-jade-400 font-medium">
                        {m.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-300 font-medium truncate">
                          @{m.user.username}
                        </p>
                        {isCreator && (
                          <span className="text-[9px] text-jade-600 flex items-center gap-0.5">
                            <Crown size={8} /> Creator
                          </span>
                        )}
                        {isSelf && !isCreator && (
                          <span className="text-[9px] text-slate-700">(you)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-700 truncate">{m.user.email}</p>
                    </div>
                    <RoleBadge role={m.projectRole} />
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(m.id, m.user.id)}
                        disabled={removing === m.id}
                        className="p-1.5 hover:bg-red-950/40 rounded-lg transition-colors
                                   text-slate-700 hover:text-red-400 flex-shrink-0
                                   disabled:opacity-50">
                        {removing === m.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <button onClick={onClose}
              className="w-full py-2.5 bg-white/[0.04] border border-white/[0.07] text-slate-400
                         text-sm rounded-xl hover:bg-white/[0.07] transition-all">
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
