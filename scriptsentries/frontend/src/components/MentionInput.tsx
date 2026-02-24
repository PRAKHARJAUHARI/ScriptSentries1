import { useState, useRef, useEffect, useCallback } from 'react'
import { searchUsers, type UserSummary } from '../api/authApi'
import { AtSign, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

const ROLE_COLORS: Record<string, string> = {
  ATTORNEY: 'text-purple-400 bg-purple-950/50 border-purple-900/40',
  ANALYST:  'text-blue-400 bg-blue-950/50 border-blue-900/40',
  ADMIN:    'text-jade-400 bg-jade-950/50 border-jade-900/40',
  VIEWER:   'text-slate-400 bg-slate-800/50 border-slate-700/40',
}

export function MentionInput({ value, onChange, placeholder, rows = 3, disabled }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mentionQuery) { setUsers([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setLoading(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchUsers(mentionQuery)
        setUsers(results)
        setActiveIndex(0)
      } catch { setUsers([]) }
      finally { setLoading(false) }
    }, 200)
  }, [mentionQuery])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const cursorPos = e.target.selectionStart
    onChange(text)

    const textBeforeCursor = text.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(atIndex)
        setMentionQuery(textAfterAt)
        setShowDropdown(true)
        return
      }
    }
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStart(-1)
  }

  const selectUser = useCallback((user: UserSummary) => {
    if (mentionStart === -1) return
    const before = value.slice(0, mentionStart)
    const cursorPos = textareaRef.current?.selectionStart ?? value.length
    const after = value.slice(cursorPos)
    const newText = `${before}@${user.username} ${after}`
    onChange(newText)
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStart(-1)
    setUsers([])
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        const pos = before.length + user.username.length + 2
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [value, mentionStart, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || users.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % users.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + users.length) % users.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectUser(users[activeIndex]) }
    else if (e.key === 'Escape') setShowDropdown(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <textarea ref={textareaRef} value={value} onChange={handleChange}
          onKeyDown={handleKeyDown} rows={rows} disabled={disabled}
          placeholder={placeholder ?? 'Type @ to mention a colleague...'}
          className="w-full bg-white/[0.03] border border-white/[0.07] text-slate-200 text-sm
                     rounded-xl px-4 py-3 pr-8 focus:outline-none focus:border-jade-600/50
                     focus:bg-jade-950/10 placeholder-slate-700 resize-none transition-all
                     disabled:opacity-50" />
        <AtSign size={13} className={`absolute right-3 top-3 transition-colors ${
          showDropdown ? 'text-jade-500' : 'text-slate-800'
        }`} />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1.5 z-[60]
                     bg-[#0a1018] border border-white/[0.1] rounded-xl shadow-2xl
                     overflow-hidden animate-slide-up">

          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
            <AtSign size={10} className="text-jade-600" />
            <span className="text-[10px] text-slate-700 uppercase tracking-wider">
              {loading ? 'Searching...' : 'Mention colleague'}
            </span>
            {loading && <Loader2 size={10} className="animate-spin text-slate-700 ml-auto" />}
          </div>

          {users.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto">
              {users.map((user, idx) => (
                <li key={user.id}
                  onMouseDown={e => { e.preventDefault(); selectUser(user) }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    idx === activeIndex ? 'bg-jade-900/30' : 'hover:bg-white/[0.03]'
                  }`}>
                  <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08]
                                  flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-slate-400">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">@{user.username}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                        ROLE_COLORS[user.role] ?? 'text-slate-500 bg-slate-800/50 border-slate-700/40'
                      }`}>{user.role}</span>
                    </div>
                    <span className="text-[11px] text-slate-700 truncate block">{user.email}</span>
                  </div>
                  {idx === activeIndex && (
                    <span className="text-[10px] text-slate-700 flex-shrink-0">↵</span>
                  )}
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="px-4 py-5 text-center text-slate-700 text-xs">
              {mentionQuery ? `No users matching "@${mentionQuery}"` : 'Type a name to search'}
            </div>
          ) : null}

          <div className="px-3 py-1.5 border-t border-white/[0.04] flex gap-3 text-[10px] text-slate-800">
            <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
          </div>
        </div>
      )}
    </div>
  )
}
