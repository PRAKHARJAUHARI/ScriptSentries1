import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Loader2, ExternalLink } from 'lucide-react'
import { getNotifications, markAllRead, type NotificationResponse } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  onNavigateToRisk?: (riskFlagId: number) => void
}

export function NotificationBell({ onNavigateToRisk }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.isRead).length

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getNotifications(user.userId)
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  // Load on mount and every 30s
  useEffect(() => {
    load()
    if (!user) return
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Reload when panel opens
  useEffect(() => {
    if (open) load()
  }, [open])

  const handleMarkRead = async () => {
    if (!user) return
    await markAllRead(user.userId)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  // Click a notification — navigate to the risk and close panel
  const handleNotificationClick = (notification: NotificationResponse) => {
    if (notification.riskFlagId && onNavigateToRisk) {
      onNavigateToRisk(notification.riskFlagId)
    }
    setOpen(false)
    // Mark individual as read by marking all (simple approach)
    if (!notification.isRead) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-colors ${
          open ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
        }`}>
        <Bell size={16} className={unread > 0 ? 'text-jade-400' : 'text-slate-600'} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full
                           text-[9px] font-bold text-white flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#0a1018] border border-white/[0.1]
                        rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-jade-500" />
              <span className="text-sm font-medium text-white">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-jade-950/60
                                 text-jade-400 border border-jade-900/40 font-medium">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkRead}
                className="flex items-center gap-1 text-[11px] text-slate-600
                           hover:text-jade-400 transition-colors">
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={16} className="animate-spin text-slate-700" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell size={24} className="text-slate-800 mx-auto mb-3" />
                <p className="text-slate-700 text-sm">No notifications yet</p>
                <p className="text-slate-800 text-xs mt-1">
                  You'll be notified when someone @mentions you
                </p>
              </div>
            ) : (
              notifications.map(n => {
                const isClickable = !!n.riskFlagId && !!onNavigateToRisk
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    disabled={!isClickable && n.isRead}
                    className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04]
                                transition-all duration-150 group
                                ${!n.isRead ? 'bg-jade-950/15' : ''}
                                ${isClickable
                                  ? 'hover:bg-white/[0.04] cursor-pointer'
                                  : 'cursor-default'
                                }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Unread dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        {!n.isRead
                          ? <div className="w-1.5 h-1.5 rounded-full bg-jade-500" />
                          : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${
                          !n.isRead ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-700">{formatTime(n.createdAt)}</span>
                          {isClickable && (
                            <span className={`flex items-center gap-1 text-[10px] font-medium
                                             transition-colors ${
                                               !n.isRead ? 'text-jade-600' : 'text-slate-700'
                                             } group-hover:text-jade-400`}>
                              <ExternalLink size={9} />
                              View risk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.05]">
              <p className="text-[10px] text-slate-800 text-center">
                Click any notification to jump to that risk
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
