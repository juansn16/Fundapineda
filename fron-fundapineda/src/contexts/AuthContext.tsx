import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authService, LoginResponse, UsuarioCompleto, UsuarioPerfil } from '../lib/auth'
import { useIdleTimer } from '../hooks/useIdleTimer'
import { extractErrorMessage } from '../lib/errorUtils'

interface AuthContextType {
  user: UsuarioCompleto | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectTo?: string }>
  adoptSession: (accessToken: string, refreshToken: string) => Promise<void>
  logout: () => void
  hasRole: (roles: string | string[]) => boolean
  updateUser: (user: UsuarioCompleto) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toUsuarioCompleto(profile: UsuarioPerfil): UsuarioCompleto {
  return {
    id: profile.id,
    email: profile.email,
    persona: profile.persona,
    roles: profile.roles,
    is_verified: profile.is_verified,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioCompleto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const persist = useCallback((userData: UsuarioCompleto) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  useEffect(() => {
    const token = authService.getToken()
    const savedUser = authService.getUser()

    if (!token) {
      if (savedUser) authService.logout()
      setIsLoading(false)
      return
    }

    // Pintado optimista con el usuario guardado, y reconciliacion con el
    // servidor: si el token ya expiro, el localStorage estava desactualizado y
    // la sesion se cierra en vez de fallar mas tarde en una peticion cualquiera.
    if (savedUser) setUser(savedUser)
    setIsLoading(false)

    let cancelled = false
    authService.getProfile()
      .then((profile) => {
        if (!cancelled) persist(toUsuarioCompleto(profile))
      })
      .catch(() => {
        if (cancelled) return
        authService.logout()
        setUser(null)
      })

    return () => { cancelled = true }
  }, [persist])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response: LoginResponse = await authService.login(email, password)

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)

      // Obtener perfil completo con roles
      const profile = await authService.getProfile()
      persist(toUsuarioCompleto(profile))

      return { success: true, redirectTo: '/dashboard' }
    } catch (error: unknown) {
      return { 
        success: false, 
        error: extractErrorMessage(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [persist])

  // Tras un registro el provider ya esta montado, por lo que no basta con
  // escribir en localStorage: hay que actualizar tambien el estado en memoria
  // o ProtectedRoute sigue viendo user === null y rebota a /login.
  const adoptSession = useCallback(async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    const profile = await authService.getProfile()
    persist(toUsuarioCompleto(profile))
  }, [persist])

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile()
      persist(toUsuarioCompleto(profile))
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [persist])

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user?.roles) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.some(r => user.roles?.includes(r))
  }, [user])

  // Idle timer for auto-logout after 1 hour of inactivity
  const handleIdle = useCallback(() => {
    logout()
  }, [logout])

  useIdleTimer({
    idleTimeout: 60 * 60 * 1000,  // 1 hour
    checkInterval: 5 * 60 * 1000,  // Check every 5 minutes
    onIdle: handleIdle,
    isAuthenticated: !!user
  })

  const updateUser = useCallback((updatedUser: UsuarioCompleto) => {
    persist(updatedUser)
  }, [persist])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        adoptSession,
        logout,
        hasRole,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}