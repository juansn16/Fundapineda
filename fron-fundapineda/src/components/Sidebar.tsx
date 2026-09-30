import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Newspaper, 
  Users, 
  ShieldCheck, 
  BarChart3,
  MessageSquare,
  FileSpreadsheet,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export function Sidebar() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = () => {
    if (user?.persona?.nombre && user?.persona?.apellido) {
      return `${user.persona.nombre[0]}${user.persona.apellido[0]}`.toUpperCase()
    }
    return user?.email?.[0].toUpperCase() || 'U'
  }

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard, roles: null },
    { path: '/dashboard/profile', label: 'Mi Perfil', icon: User, roles: null },
    { path: '/dashboard/news', label: 'Gestión de Noticias', icon: Newspaper, roles: ['creador_contenido'] },
    { path: '/dashboard/users', label: 'Gestión de Usuarios', icon: Users, roles: ['administrador'] },
    { path: '/dashboard/metrics', label: 'Métricas', icon: BarChart3, roles: ['administrador'] },
    { path: '/dashboard/contact', label: 'Mensajes', icon: MessageSquare, roles: ['administrador'] },
    { path: '/dashboard/reports', label: 'Reportes', icon: FileSpreadsheet, roles: ['administrador'] },
    { path: '/dashboard/roles', label: 'Configuración de Roles', icon: ShieldCheck, roles: ['administrador'] },
  ]

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.some(role => hasRole(role))
  )

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-md"
        aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.persona?.nombre || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            {user?.is_verified !== undefined && (
              <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.is_verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.is_verified ? 'Verificado' : 'Pendiente'}
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
