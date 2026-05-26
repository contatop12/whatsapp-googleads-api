'use client'

import { createContext, useContext } from 'react'
import type { UserRole } from '@/lib/api-types'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: UserRole
  tenant_id: string | null
}

type AuthContextValue = {
  user: AuthUser
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser
  children: React.ReactNode
}) {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
