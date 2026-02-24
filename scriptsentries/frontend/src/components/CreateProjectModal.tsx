// src/components/CreateProjectModal.tsx

import { useState, FormEvent } from 'react'
import { X, Plus, Trash2, Loader2, Film, Building2 } from 'lucide-react'
import {
  createProject,
  type ProjectResponse,
  type ProjectRole,
} from '../api/projectApi'
import { searchUsers } from '../api/authApi'
import type { UserSummary } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
  onCreated: (project: ProjectResponse) => void
}

const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'ATTORNEY',                label: 'Attorney'              },
  { value: 'ANALYST',                 label: 'Analyst'               },
  { value: 'MAIN_PRODUCTION_CONTACT', label: 'Production Contact'    },
  { value: 'PRODUCTION_ASSISTANT',    label: 'Production Assistant'  },
]

interface MemberRow { user: UserSummary; projectRole: ProjectRole }

export function CreateProjectModal({ onClose, onCreated }: Props) {
  const { user } = useAuth()
  const [name,          setName]          = useState('')
  const [studioName,    setStudioName]    = useState('')
  const [members,       setMembers]       = useState<MemberRow[]>([])
  const [searchQ,       setSearchQ]       = useState('')
  const [searchResults, setSearchResults] = useState<UserSummary[]>([])
  const [loading,       setLoading]       = useState(false)
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

  const addMember = (u: UserSummary) => {
    setMembers(prev => [...prev, { user: u, projectRole: 'ANALYST' }])
    setSearchResults([])
    setSearchQ('')
  }

  const removeMember  = (uid: number) => setMembers(prev => prev.filter(m => m.user.id !== uid))
  const updateRole    = (uid: number, role: ProjectRole) =>
    setMembers(prev => prev.map(m => m.user.id === uid ? { ...m, projectRole: role } : m))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return
    setError(null)
    setLoading(true)
    try {
      const project = await createProject(
        {
          name: name.trim(),
          studioName: studioName.trim() || undefined,
          members: members.map(m => ({ userId: m.user.id, projectRole: m.projectRole })),
        },
        user.userId
      )
      onCreated(project)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to create project'
      )
    } finally {
      setLoading(false)
    }
  }

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
                <Film size={15} className="text-jade-400" />
              </div>
              <div>
                <h2 className="font-display text-lg text-white">New Project</h2>
                <p className="text-[11px] text-slate-600">Create a script clearance project</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 hover:bg-white/[0.07] rounded-xl transition-colors">
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* Project name */}
              <div>
                <label className="block text-[10px] text-slate-600 mb-1.5 uppercase tracking-widest">
                  Project Name *
                </label>
                <div className="relative">
                  <Film size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Untitled Feature Film" required
                    className="w-full bg-white/[0.03] border border-white/[0.07] text-white text-sm
                               rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-jade-600/50
                               placeholder-slate-700 transition-all" />
                </div>
              </div>

              {/* Studio */}
              <div>
                <label className="block text-[10px] text-slate-600 mb-1.5 uppercase tracking-widest">
                  Studio / Production Company
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700" />
                  <input type="text" value={studioName} onChange={e => setStudioName(e.target.value)}
                    placeholder="Universal Pictures"
                    className="w-full bg-white/[0.03] border border-white/[0.07] text-white text-sm
                               rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-jade-600/50
                               placeholder-slate-700 transition-all" />
                </div>
              </div>

              {/* Member search */}
              <div>
                <label className="block text-[10px] text-slate-600 mb-1.5 uppercase tracking-widest">
                  Invite Team Members
                </label>
                <div className="relative">
                  <input type="text" value={searchQ} onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by username..."
                    className="w-full bg-white/[0.03] border border-white/[0.07] text-white text-sm
                               rounded-xl px-4 py-3 focus:outline-none focus:border-jade-600/50
                               placeholder-slate-700 transition-all" />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a1018]
                                    border border-white/[0.1] rounded-xl shadow-xl z-10 overflow-hidden">
                      {searchResults.map(u => (
                        <button key={u.id} type="button" onClick={() => addMember(u)}
                          className="w-full flex items-center gap-3 px-4 py-2.5
                                     hover:bg-white/[0.05] transition-colors text-left">
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
                          <Plus size={12} className="text-jade-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Added members list */}
              {members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-700 uppercase tracking-widest">Added Members</p>
                  {members.map(m => (
                    <div key={m.user.id}
                      className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06]
                                 rounded-xl px-3 py-2.5">
                      <div className="w-6 h-6 rounded-full bg-jade-900/40 border border-jade-800/40
                                      flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-jade-400 font-medium">
                          {m.user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-slate-300 flex-1 truncate">@{m.user.username}</span>
                      <select
                        value={m.projectRole}
                        onChange={e => updateRole(m.user.id, e.target.value as ProjectRole)}
                        className="bg-white/[0.04] border border-white/[0.07] text-slate-400 text-xs
                                   rounded-lg px-2 py-1 focus:outline-none focus:border-jade-600/50">
                        {PROJECT_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeMember(m.user.id)}
                        className="p-1 hover:bg-red-950/40 rounded-lg transition-colors
                                   text-slate-700 hover:text-red-400 flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/30
                               rounded-xl px-4 py-3">{error}</p>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.06] flex gap-3">
              <button type="submit" disabled={loading || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5
                           bg-jade-700 hover:bg-jade-600 text-white text-sm font-medium
                           rounded-xl transition-all disabled:opacity-50">
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Creating...</>
                  : 'Create Project'
                }
              </button>
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 bg-white/[0.04] border border-white/[0.07]
                           text-slate-400 text-sm rounded-xl hover:bg-white/[0.07] transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
