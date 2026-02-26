import { useState, useEffect } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { MentionInput } from './MentionInput'
import { getComments, postComment, type CommentResponse } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

interface Props {
  riskFlagId: number
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-jade-400 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  )
}

const ROLE_COLORS: Record<string, string> = {
  ATTORNEY: 'bg-purple-950/60 text-purple-400',
  ANALYST:  'bg-blue-950/60 text-blue-400',
  ADMIN:    'bg-jade-950/60 text-jade-400',
  VIEWER:   'bg-slate-800 text-slate-400',
}

export function CommentsPanel({ riskFlagId }: Props) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getComments(riskFlagId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [riskFlagId])

  const handleSubmit = async () => {
    if (!text.trim() || !user) return
    setSubmitting(true)
    try {
      const comment = await postComment({
        text: text.trim(),
        riskFlagId,
        authorId: user.userId,
      })
      setComments(prev => [...prev, comment])
      setText('')
    } catch (e) {
      console.error('Failed to post comment', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <MessageSquare size={12} />
        Team Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment list */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-slate-600" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-slate-700 text-sm">
            No comments yet. Be the first to comment.
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id}
              className="bg-obsidian-800/40 border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-obsidian-700 border border-white/10
                                flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-medium text-slate-400">
                    {comment.author.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">@{comment.author.username}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  ROLE_COLORS[comment.author.role] ?? 'bg-slate-800 text-slate-400'
                }`}>
                  {comment.author.role}
                </span>
                <span className="text-xs text-slate-700 ml-auto">{formatTime(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pl-8">
                {highlightMentions(comment.text)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {user ? (
        <div className="space-y-2">
          <MentionInput
            value={text}
            onChange={setText}
            placeholder="Comment... use @username to mention a colleague"
            rows={2}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="btn-primary text-sm py-2"
            >
              {submitting
                ? <><Loader2 size={13} className="animate-spin" /> Posting...</>
                : <><Send size={13} /> Post Comment</>
              }
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-600 text-center">Sign in to comment</p>
      )}
    </div>
  )
}
