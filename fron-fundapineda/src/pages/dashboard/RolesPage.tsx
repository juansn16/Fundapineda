import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, AlertCircle, Search, ShieldCheck, ShieldOff, Lock } from 'lucide-react'
import { rolesService, RolData } from '../../lib/rolesService'
import { extractErrorMessage } from '../../lib/errorUtils'
import { Field } from '../../components/Field'

const PROTECTED_ROLES: Record<string, { modify: boolean; delete: boolean }> = {
  administrador: { modify: true, delete: true },
  creador_contenido: { modify: false, delete: true },
  jefe_familia: { modify: false, delete: true },
}

export function RolesPage() {
  const [roles, setRoles] = useState<RolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RolData | null>(null)
  const [formRol, setFormRol] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formError, setFormError] = useState('')

  const [deletingRole, setDeletingRole] = useState<RolData | null>(null)

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles
    const lower = searchTerm.toLowerCase()
    return roles.filter(r => r.rol.toLowerCase().includes(lower))
  }, [roles, searchTerm])

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRoles = filteredRoles.slice(startIndex, endIndex)

  useEffect(() => {
    loadRoles()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadRoles = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await rolesService.list()
      setRoles(data)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingRole(null)
    setFormRol('')
    setFormDescripcion('')
    setFormError('')
    setIsFormModalOpen(true)
  }

  const openEditModal = (role: RolData) => {
    setEditingRole(role)
    setFormRol(role.rol)
    setFormDescripcion(role.descripcion || '')
    setFormError('')
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingRole(null)
    setFormRol('')
    setFormDescripcion('')
    setFormError('')
  }

  const handleSave = async () => {
    const trimmedRol = formRol.trim()
    if (trimmedRol.length < 3) {
      setFormError('El nombre del rol debe tener al menos 3 caracteres')
      return
    }
    if (trimmedRol.length > 50) {
      setFormError('El nombre del rol no puede exceder 50 caracteres')
      return
    }

    try {
      setSaving(true)
      setFormError('')
      const descripcion = formDescripcion.trim() || undefined

      if (editingRole) {
        await rolesService.update(editingRole.id, {
          rol: trimmedRol,
          descripcion,
        })
      } else {
        await rolesService.create({
          rol: trimmedRol,
          descripcion,
        })
      }

      closeFormModal()
      await loadRoles()
    } catch (err: unknown) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (role: RolData) => {
    setDeletingRole(role)
  }

  const confirmDelete = async () => {
    if (!deletingRole) return
    try {
      setSaving(true)
      await rolesService.delete(deletingRole.id)
      setDeletingRole(null)
      await loadRoles()
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const isProtected = (roleName: string, action: 'modify' | 'delete'): boolean => {
    return PROTECTED_ROLES[roleName]?.[action] ?? false
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrador': return 'bg-purple-100 text-purple-800'
      case 'creador_contenido': return 'bg-blue-100 text-blue-800'
      case 'usuario':
      case 'jefe_familia': return 'bg-green-100 text-green-800'
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
      className="max-w-5xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Roles</h1>
            <p className="text-gray-600 mt-2">
              Administra los roles del sistema y sus permisos
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Nuevo Rol
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre de rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Results count */}
        {searchTerm && (
          <p className="text-sm text-gray-600 mb-4">
            {filteredRoles.length} resultado(s) encontrado(s)
          </p>
        )}

        {/* Table */}
        {roles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No hay roles registrados</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary hover:underline text-sm font-medium"
            >
              Crear el primer rol
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Rol</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Descripción</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Estado</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRoles.map((role) => {
                    const cantModify = isProtected(role.rol, 'modify')
                    const cantDelete = isProtected(role.rol, 'delete')

                    return (
                      <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${getRoleBadgeColor(role.rol)} flex items-center justify-center font-bold text-sm`}>
                              {role.rol[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{role.rol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                          {role.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                        </td>
                        <td className="p-3">
                          {cantModify ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <Lock size={12} />
                              Protegido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <ShieldOff size={12} />
                              Disponible
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(role)}
                              disabled={cantModify}
                              className={`p-2 rounded-lg transition-colors ${
                                cantModify
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                              title={cantModify ? 'Este rol no puede ser modificado' : 'Editar rol'}
                              aria-label={cantModify ? 'Este rol no puede ser modificado' : 'Editar rol'}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(role)}
                              disabled={cantDelete}
                              className={`p-2 rounded-lg transition-colors ${
                                cantDelete
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={cantDelete ? 'Este rol no puede ser eliminado' : 'Eliminar rol'}
                              aria-label={cantDelete ? 'Este rol no puede ser eliminado' : 'Eliminar rol'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                ))}
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

      {/* Modal Create / Edit */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <Field
                label="Nombre del Rol"
                htmlFor="rol-nombre"
                hint="Mínimo 3 caracteres, máximo 50"
              >
                <input
                  id="rol-nombre"
                  type="text"
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value)}
                  placeholder="ej: moderador"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                  maxLength={50}
                  autoFocus
                />
              </Field>
              <Field
                label="Descripción"
                htmlFor="rol-descripcion"
                hint="Máximo 255 caracteres (opcional)"
              >
                <textarea
                  id="rol-descripcion"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Describe el propósito de este rol..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none resize-none"
                  rows={3}
                  maxLength={255}
                />
              </Field>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeFormModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  editingRole ? 'Guardar Cambios' : 'Crear Rol'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deletingRole && (
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
                  ¿Estás seguro de eliminar el rol <strong>{deletingRole.rol}</strong>?
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Esta acción no se puede deshacer. Si el rol está asignado a algún usuario, no podrá ser eliminado.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingRole(null)}
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
