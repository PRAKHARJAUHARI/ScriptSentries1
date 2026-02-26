// src/context/AuthContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: string
  token: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('ss_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (u: AuthUser) => {
    localStorage.setItem('ss_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('ss_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Role permission helpers
export function canUpload(role: string): boolean {
  return ['ATTORNEY', 'ANALYST'].includes(role)
}

export function canManageMembers(role: string): boolean {
  return ['ATTORNEY', 'ANALYST'].includes(role)
}

export function canEdit(role: string): boolean {
  return ['ATTORNEY', 'ANALYST', 'PRODUCTION_ASSISTANT'].includes(role)
}

export function canChangeStatus(role: string): boolean {
  return ['ATTORNEY', 'ANALYST'].includes(role)
}