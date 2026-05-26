import { useAuth } from '@/contexts/auth-context'

export function usePermissions() {
  const { user } = useAuth()

  return {
    canEditEmail:        user.role === 'super_admin' || user.role === 'admin',
    canAccessAdminPanel: user.role === 'super_admin',
    canManageUsers:      user.role === 'super_admin' || user.role === 'admin',
    canEditSlug:         user.role === 'super_admin',
    canManageTenants:    user.role === 'super_admin',
    isSuperAdmin:        user.role === 'super_admin',
    isAdmin:             user.role === 'admin',
    isClient:            user.role === 'client',
    role:                user.role,
  }
}
