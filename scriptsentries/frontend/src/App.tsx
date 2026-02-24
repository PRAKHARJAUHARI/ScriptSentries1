// src/App.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, FileText, Download, ChevronLeft,
  Loader2, Clock, LogOut, User, Film, Plus, Users,
  Upload, GitBranch, ChevronRight
} from 'lucide-react'
import type { Script, RiskFlag } from './types'
import { listScripts, getScript, exportScript, scanScript } from './api/api'
import { getProjects, type ProjectResponse } from './api/projectApi'
import { RiskTable } from './components/RiskTable'
import { RiskDrawer } from './components/RiskDrawer'
import { AuthPage } from './components/AuthPage'
import { NotificationBell } from './components/NotificationBell'
import { Timeline } from './components/Timeline'
import { CreateProjectModal } from './components/CreateProjectModal'
import { VersionLabelModal } from './components/VersionLabelModal'
import { AuthProvider, useAuth, canUpload } from './context/AuthContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type View = 'home' | 'project' | 'workbench'

const ROLE_COLORS: Record<string, string> = {
  ATTORNEY:                'text-violet-700 bg-violet-50 border-violet-200',
  ANALYST:                 'text-blue-700   bg-blue-50   border-blue-200',
  MAIN_PRODUCTION_CONTACT: 'text-amber-700  bg-amber-50  border-amber-200',
  PRODUCTION_ASSISTANT:    'text-slate-600  bg-slate-100 border-slate-200',
  VIEWER:                  'text-zinc-500   bg-zinc-100  border-zinc-200',
}

// ─── Upload button — only rendered inside project view ────────────────────────
interface ProjectUploadButtonProps {
  projectId: number   // always activeProject.id — a real number, never undefined
  onDone: (script: Script) => void
}

function ProjectUploadButton({ projectId, onDone }: ProjectUploadButtonProps) {
  const { user } = useAuth()
  const allowed = user ? canUpload(user.role) : false

  const [phase,    setPhase]    = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState<string | null>(null)

  if (!allowed) return null

  const busy = phase !== 'idle'

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File must be under 50MB.')
      return
    }
    setError(null)
    setPhase('uploading')
    setProgress(0)

    try {
      // Pass projectId as second arg — api.ts appends it to FormData
      // so the backend receives it as @RequestParam("projectId")
      const script = await scanScript(file, projectId, (pct) => {
        setProgress(pct)
        if (pct >= 100) setPhase('analyzing')
      })
      setPhase('idle')
      setProgress(0)
      onDone(script)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ?? 'Upload failed. Please try again.'
      setError(msg)
      setPhase('idle')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    cursor-pointer select-none border shadow-sm transition-all
                    ${busy
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 active:scale-95'
                    }`}
      >
        {phase === 'uploading' && <><Loader2 size={14} className="animate-spin" /> Uploading {progress}%</>}
        {phase === 'analyzing' && <><Loader2 size={14} className="animate-spin" /> Analyzing…</>}
        {phase === 'idle'      && <><Upload size={14} /> Upload New Script</>}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={busy}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppInner() {
  const { user, logout, isAuthenticated } = useAuth()

  const [view,          setView]          = useState<View>('home')
  const [scripts,       setScripts]       = useState<Script[]>([])
  const [projects,      setProjects]      = useState<ProjectResponse[]>([])
  const [activeScript,  setActiveScript]  = useState<Script | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectResponse | null>(null)
  const [selectedRisk,  setSelectedRisk]  = useState<RiskFlag | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const [showCreate,    setShowCreate]    = useState(false)
  const [timelineKey,   setTimelineKey]   = useState(0)
  const [pendingLabel,  setPendingLabel]  = useState<{ script: Script; projectId: number } | null>(null)

  const loadScripts  = useCallback(async () => {
    try { setScripts(await listScripts()) } catch { /* ignore */ }
  }, [])

  const loadProjects = useCallback(async () => {
    if (!user) return
    try { setProjects(await getProjects(user.userId)) } catch { /* ignore */ }
  }, [user])

  useEffect(() => {
    if (isAuthenticated) { loadScripts(); loadProjects() }
  }, [loadScripts, loadProjects, isAuthenticated])

  if (!isAuthenticated) return <AuthPage />

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openScript = async (id: number) => {
    setLoading(true)
    try {
      const script = await getScript(id)
      setActiveScript(script); setView('workbench'); setSelectedRisk(null)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleUploadDone = async (script: Script) => {
    await loadScripts()
    setTimelineKey(k => k + 1)
    setPendingLabel({ script, projectId: activeProject!.id })
  }

  const handleLabelDone = async () => {
    setPendingLabel(null)
    await loadScripts()
    await loadProjects()
    setTimelineKey(k => k + 1)
  }

  const handleRiskUpdated = (updated: RiskFlag) => {
    setActiveScript(prev => !prev ? prev : ({
      ...prev,
      risks: prev.risks!.map(r => r.id === updated.id ? updated : r),
    }))
    setSelectedRisk(updated)
  }

  const handleNavigateToRisk = async (riskFlagId: number) => {
    const existing = activeScript?.risks?.find(r => r.id === riskFlagId)
    if (existing) { setSelectedRisk(existing); setView('workbench'); return }
    setLoading(true)
    try {
      const all = scripts.length > 0 ? scripts : await listScripts().then(s => { setScripts(s); return s })
      for (const s of all) {
        const full = await getScript(s.id)
        const risk = full.risks?.find(r => r.id === riskFlagId)
        if (risk) { setActiveScript(full); setView('workbench'); setSelectedRisk(risk); return }
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleExport = async () => {
    if (!activeScript) return
    setExporting(true)
    try { await exportScript(activeScript.id) } catch { /* ignore */ }
    finally { setExporting(false) }
  }

  const handleProjectCreated = (project: ProjectResponse) => {
    setProjects(prev => [project, ...prev])
    setShowCreate(false)
    setActiveProject(project)
    setView('project')
  }

  const risks     = activeScript?.risks ?? []
  const highCount = risks.filter(r => r.severity === 'HIGH').length

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setView('home'); setActiveScript(null); setActiveProject(null); setSelectedRisk(null) }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center">
                <ShieldCheck size={15} className="text-emerald-600" />
              </div>
              <span className="font-display text-lg text-slate-900 tracking-tight">
                Script<span className="text-emerald-600">Sentries</span>
              </span>
            </button>
            {projects.length > 0 && (
              <button
                onClick={() => { setView('home'); setActiveScript(null); setActiveProject(null) }}
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                <GitBranch size={11} />
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            bg-emerald-50 border border-emerald-200 text-emerald-600
                            text-[10px] font-medium uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero Retention
            </div>
            {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
            <NotificationBell onNavigateToRisk={handleNavigateToRisk} />
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <User size={12} className="text-slate-400" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-700 leading-none">@{user?.username}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 ml-1">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">

        {/* ══ HOME ══ */}
        {view === 'home' && (
          <div className="animate-fade-in space-y-10">

            <div className="text-center max-w-2xl mx-auto pt-4">
              <h1 className="text-slate-900 text-4xl font-display mb-3 leading-tight">
                Script Clearance, <span className="text-emerald-600">Zero Footprint</span>
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">
                AI-powered risk detection for film &amp; TV scripts. Create a project,
                upload versions, and clear every flag.
              </p>
            </div>

            {/* Projects grid */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Film size={13} /> Projects
                </h2>
                <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-1.5 px-3">
                  <Plus size={13} /> New Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                  <Film size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No projects yet</p>
                  <p className="text-slate-400 text-sm mt-1 mb-4">Scripts must belong to a project</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary">
                    <Plus size={14} /> Create First Project
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map(project => (
                    <button key={project.id}
                      onClick={() => { setActiveProject(project); setView('project') }}
                      className="group text-left p-5 rounded-2xl border border-slate-200 bg-white
                                 hover:border-emerald-300 hover:shadow-md transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                          <Film size={14} className="text-emerald-600" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {project.totalScripts} version{project.totalScripts !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm truncate mb-0.5">{project.name}</p>
                      {project.studioName && (
                        <p className="text-[11px] text-slate-400 truncate mb-2">{project.studioName}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Users size={9} />
                          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                        </span>
                        {project.totalRisks > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">{project.totalRisks} risks</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-3 font-medium">
                        Open project <ChevronRight size={10} />
                      </div>
                    </button>
                  ))}

                  <button onClick={() => setShowCreate(true)}
                    className="group text-left p-5 rounded-2xl border-2 border-dashed border-slate-200
                               bg-white hover:border-emerald-300 hover:bg-emerald-50/40 transition-all">
                    <div className="p-2.5 rounded-xl bg-slate-100 w-fit mb-3 group-hover:bg-emerald-100 transition-colors">
                      <Plus size={14} className="text-slate-500 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <p className="font-medium text-slate-400 group-hover:text-emerald-600 text-sm transition-colors">New Project</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">Create a clearance project</p>
                  </button>
                </div>
              )}
            </div>

            {/* Recent scripts */}
            {scripts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">Recent Scripts</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scripts.slice(0, 6).map(script => (
                    <button key={script.id} onClick={() => openScript(script.id)} disabled={loading}
                      className="group text-left p-4 rounded-xl border border-slate-200 bg-white
                                 hover:border-emerald-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <FileText size={13} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                          script.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : script.status === 'FAILED' ? 'bg-red-50 text-red-500 border border-red-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>{script.status}</span>
                      </div>
                      <p className="font-medium text-slate-700 text-sm truncate mb-1">{script.filename}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{script.totalPages}p</span>
                        <span>·</span>
                        <span className="text-red-500">{script.riskCount} risks</span>
                        <span>·</span>
                        <Clock size={9} /><span>{formatDate(script.uploadedAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PROJECT VIEW ══ */}
        {view === 'project' && activeProject && (
          <div className="space-y-8 animate-fade-in">

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={() => { setView('home'); setActiveProject(null) }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400
                             hover:text-slate-700 border border-slate-200 bg-white">
                  <ChevronLeft size={17} />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Film size={14} className="text-emerald-600" />
                    <h1 className="font-display text-2xl text-slate-900">{activeProject.name}</h1>
                  </div>
                  {activeProject.studioName && (
                    <p className="text-slate-400 text-sm ml-6">{activeProject.studioName}</p>
                  )}
                </div>
              </div>

              {/* activeProject.id is always a concrete number here */}
              <ProjectUploadButton projectId={activeProject.id} onDone={handleUploadDone} />
            </div>

            {/* Team */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={11} /> Team
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeProject.members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200
                                    flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {m.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 font-medium truncate">@{m.user.username}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                        ROLE_COLORS[m.projectRole] ?? 'text-slate-500 bg-slate-100 border-slate-200'
                      }`}>
                        {m.projectRole.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline — key changes after every upload to force re-fetch */}
            <div>
              <h3 className="text-[10px] text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <ChevronRight size={11} /> Script Versions
              </h3>
              <Timeline key={timelineKey} projectId={activeProject.id} onOpenScript={openScript} />
            </div>
          </div>
        )}

        {/* ══ WORKBENCH ══ */}
        {view === 'workbench' && activeScript && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setView(activeProject ? 'project' : 'home'); setActiveScript(null); setSelectedRisk(null) }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400
                             hover:text-slate-700 border border-slate-200 bg-white">
                  <ChevronLeft size={17} />
                </button>
                <div>
                  <h1 className="font-display text-2xl text-slate-900 leading-tight">
                    {activeScript.filename.replace('.pdf', '')}
                  </h1>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span>{activeScript.totalPages} pages</span>
                    <span>·</span>
                    <span>{risks.length} risks</span>
                    {highCount > 0 && <><span>·</span><span className="text-red-500 font-medium">{highCount} HIGH</span></>}
                    {(activeScript as Script & { versionName?: string }).versionName && (
                      <><span>·</span>
                        <span className="text-emerald-600 font-medium">
                          {(activeScript as Script & { versionName?: string }).versionName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleExport} disabled={exporting} className="btn-primary">
                {exporting ? <><Loader2 size={14} className="animate-spin" /> Exporting…</> : <><Download size={14} /> Export Report</>}
              </button>
            </div>
            <RiskTable risks={risks} onSelectRisk={setSelectedRisk} selectedId={selectedRisk?.id} />
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleProjectCreated} />
      )}

      {pendingLabel && (
        <VersionLabelModal
          script={pendingLabel.script}
          projects={projects}
          defaultProjectId={pendingLabel.projectId}
          onComplete={handleLabelDone}
          onSkip={() => setPendingLabel(null)}
        />
      )}

      <RiskDrawer risk={selectedRisk} onClose={() => setSelectedRisk(null)} onUpdated={handleRiskUpdated} />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}