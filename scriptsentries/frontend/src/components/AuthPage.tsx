// src/components/AuthPage.tsx
import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSuccess: (user: { userId: number; username: string; email: string; role: string; token: string }) => void
  onBack?: () => void
  defaultMode?: 'login' | 'signup'
}

const ROLES = [
  { value: 'ATTORNEY', label: 'Attorney', desc: 'Full clearance control' },
  { value: 'ANALYST', label: 'Analyst', desc: 'Upload & research' },
  { value: 'MAIN_PRODUCTION_CONTACT', label: 'Production Contact', desc: 'Oversight & monitoring' },
  { value: 'PRODUCTION_ASSISTANT', label: 'Prod. Assistant', desc: 'View & comment' },
  { value: 'VIEWER', label: 'Viewer', desc: 'Read-only access' },
]

export function AuthPage({ onSuccess, onBack, defaultMode = 'login' }: Props) {
  const { login } = useAuth()
  const [mode,     setMode]     = useState<'login' | 'signup'>(defaultMode)
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('ATTORNEY')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.')
      return
    }
    if (mode === 'signup' && !email.trim()) {
      setError('Email is required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { username: username.trim(), password }
        : { username: username.trim(), email: email.trim(), password, role }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Something went wrong')

      localStorage.setItem('ss_user', JSON.stringify(data))
      login(data)
      onSuccess(data)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Back to landing */}
      {onBack && (
        <div className="p-4">
          <button onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={14} /> Back to home
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200
                            flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={22} className="text-emerald-600" />
            </div>
            <h1 className="font-display text-2xl text-slate-900">ScriptSentries</h1>
            <p className="text-slate-400 text-sm mt-1">AI-powered script clearance</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(null) }}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    mode === m
                      ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}>
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="your_username"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm
                             rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400
                             focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 transition-all"
                />
              </div>

              {/* Email (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm
                               rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400
                               focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 transition-all"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm
                               rounded-xl px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-400
                               focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 transition-all"
                  />
                  <button onClick={() => setShowPw(!showPw)} type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Role (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Your Role
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ROLES.map(r => (
                      <button key={r.value} type="button" onClick={() => setRole(r.value)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          role === r.value
                            ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          role === r.value ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                          <p className="text-[10px] text-slate-400">{r.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600
                           hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl text-sm
                           transition-all active:scale-95 disabled:opacity-50 mt-2">
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                  : mode === 'login' ? 'Sign in' : 'Create account'
                }
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            {mode === 'login'
              ? <><span>Don't have an account? </span><button onClick={() => setMode('signup')} className="text-emerald-600 hover:underline font-medium">Sign up</button></>
              : <><span>Already have an account? </span><button onClick={() => setMode('login')} className="text-emerald-600 hover:underline font-medium">Sign in</button></>
            }
          </p>
        </div>
      </div>
    </div>
  )
}