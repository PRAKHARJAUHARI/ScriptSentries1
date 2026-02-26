import axios from 'axios'

export const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api' 
})

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('ss_user')
  if (stored) {
    const { token } = JSON.parse(stored)
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface RegisterPayload {
  username: string
  email: string
  password: string
  role?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  userId: number
  username: string
  email: string
  role: string
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  return data
}

// Collab
export interface UserSummary {
  id: number
  username: string
  email: string
  role: string
}

export interface CommentResponse {
  id: number
  text: string
  author: UserSummary
  riskFlagId: number
  createdAt: string
}

export interface NotificationResponse {
  id: number
  message: string
  isRead: boolean
  riskFlagId: number | null
  createdAt: string
}

export async function searchUsers(q: string): Promise<UserSummary[]> {
  const { data } = await api.get<UserSummary[]>('/collab/users/search', { params: { q } })
  return data
}

export async function postComment(payload: {
  text: string
  riskFlagId: number
  authorId: number
}): Promise<CommentResponse> {
  const { data } = await api.post<CommentResponse>('/collab/comments', payload)
  return data
}

export async function getComments(riskFlagId: number): Promise<CommentResponse[]> {
  const { data } = await api.get<CommentResponse[]>(`/collab/comments/${riskFlagId}`)
  return data
}

export async function getNotifications(userId: number): Promise<NotificationResponse[]> {
  const { data } = await api.get<NotificationResponse[]>(`/collab/notifications/${userId}`)
  return data
}

export async function getUnreadCount(userId: number): Promise<number> {
  const { data } = await api.get<number>(`/collab/notifications/${userId}/unread-count`)
  return data
}

export async function markAllRead(userId: number): Promise<void> {
  await api.post(`/collab/notifications/${userId}/mark-read`)
}
