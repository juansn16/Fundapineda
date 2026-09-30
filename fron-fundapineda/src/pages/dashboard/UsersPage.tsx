import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, AlertCircle, CheckCircle, Search, ShieldCheck, UserCheck, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { userService, UsuarioAdmin } from '../../lib/userService'
import { rolesService } from '../../lib/rolesService'
import { extractErrorMessage } from '../../lib/errorUtils'

export function UsersPage() {
  const { hasRole } = useAuth()
  const [users, setUsers] = useState<UsuarioAdmin[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [availableRoles, setAvailableRoles] = useState<{ id: string; rol: string }[]>([])
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterVerified, setFilterVerified] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Modals
  const [editingUser, setEditingUser] = useState<UsuarioAdmin | null>(null)
  const [deletingUser, setDeletingUser] = useState<UsuarioAdmin | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  
  const canManageUsers = hasRole(['administrador'])
  const totalPages = Math.ceil(totalUsers / itemsPerPage)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load roles from backend on mount
  useEffect(() => {
    rolesService.list()
      .then(data => setAvailableRoles(data))
      .catch(() => {})
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterRole, filterVerified])

  // Load users from backend on filter/page change
  useEffect(() => {
    loadUsers()
  }, [currentPage, debouncedSearch, filterRole, filterVerified])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterRole) params.role = filterRole
      if (filterVerified === 'verified') params.is_verified = true
      else if (filterVerified === 'pending') params.is_verified = false

      const data = await userService.listAllUsers(params)
      setUsers(data.usuarios)
      setTotalUsers(data.total)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEditRoles = (user: UsuarioAdmin) => {
    setEditingUser(user)
    setSelectedRoles([...user.roles])
  }

  const handleDelete = (user: UsuarioAdmin) => {
    setDeletingUser(user)
  }

  const confirmDelete = async () => {
    if (!deletingUser) return
    
    try {
      setSaving(true)
      setError('')
      await userService.deleteUser(deletingUser.id)
      setSuccess(`Usuario "${deletingUser.email}" eliminado correctamente`)
      setDeletingUser(null)
      await loadUsers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRoles = async () => {
    if (!editingUser) return
    
    try {
      setSaving(true)
      setError('')
      await userService.updateUserRoles(editingUser.id, { roles: selectedRoles })
      setSuccess(`Roles actualizados para ${editingUser.persona?.nombre || editingUser.email}`)
      setEditingUser(null)
      setSelectedRoles([])
      await loadUsers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyUser = async (userId: string) => {
    try {
      setSaving(true)
      setError('')
      await userService.verifyUser(userId)
      setSuccess('Usuario verificado correctamente')
      await loadUsers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const getInitials = (user: UsuarioAdmin) => {
    if (user.persona?.nombre && user.persona?.apellido) {
      return `${user.persona.nombre[0]}${user.persona.apellido[0]}`.toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  const getPageNumbers = (total: number, current: number): (number | '...')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages: (number | '...')[] = [1]
    if (current > 3) pages.push('...')

    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)

    if (current < total - 2) pages.push('...')
    pages.push(total)

    return pages
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrador': return 'bg-purple-100 text-purple-800'
      case 'creador_contenido': return 'bg-blue-100 text-blue-800'
      case 'jefe_familia': return 'bg-green-100 text-green-800'
      case 'usuario': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">
              Administra los usuarios del sistema
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none appearance-none bg-white"
              >
                <option value="">Todos los roles</option>
                {availableRoles.map(r => (
                  <option key={r.rol} value={r.rol}>{r.rol}</option>
                ))}
              </select>
            </div>
            
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none appearance-none bg-white"
            >
              <option value="">Todos</option>
              <option value="verified">Verificados</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {(debouncedSearch || filterRole || filterVerified) && (
          <p className="text-sm text-gray-600 mb-4">
            {totalUsers} resultado(s) encontrado(s)
          </p>
        )}

        {/* Table */}
        {users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No hay usuarios registrados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Usuario</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Cédula</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Roles</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Estado</th>
                    {canManageUsers && (
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                            {getInitials(user)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.persona?.nombre} {user.persona?.apellido}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{user.email}</td>
                      <td className="p-3 text-sm text-gray-600">{user.persona?.cedula || 'N/A'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(role => (
                            <span key={role} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {user.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle size={12} />
                            Pendiente
                          </span>
                        )}
                      </td>
                      {canManageUsers && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            {!user.is_verified && (
                              <button
                                onClick={() => handleVerifyUser(user.id)}
                                disabled={saving}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Verificar usuario"
                                aria-label="Verificar usuario"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditRoles(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar roles"
                              aria-label="Editar roles"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                              aria-label="Eliminar usuario"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                
                {getPageNumbers(totalPages, currentPage).map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Edición de Roles */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Editar Roles - {editingUser.persona?.nombre} {editingUser.persona?.apellido}
            </h3>
            
            <div className="space-y-3 mb-6">
              {availableRoles.map(r => (
                <label key={r.rol} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.rol)}
                    onChange={() => toggleRole(r.rol)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{r.rol}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingUser(null)
                  setSelectedRoles([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Eliminación</h3>
                <p className="text-sm text-gray-600">
                  ¿Estás seguro de eliminar a {deletingUser.persona?.nombre} {deletingUser.persona?.apellido}?
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Esta acción no se puede deshacer. El usuario y todos sus datos serán eliminados permanentemente.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
