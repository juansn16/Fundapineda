import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Image, AlertCircle, CheckCircle, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { newsService, NoticiaInIndex } from '../../lib/newsService'
import { NewsFormModal } from '../../components/NewsFormModal'
import { extractErrorMessage } from '../../lib/errorUtils'

export function NewsPage() {
  const { hasRole } = useAuth()
  const [news, setNews] = useState<NoticiaInIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<NoticiaInIndex | null>(null)
  const [deletingNews, setDeletingNews] = useState<NoticiaInIndex | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const canManageNews = hasRole(['creador_contenido', 'administrador'])

  // Search filter
  const filteredNews = useMemo(() => {
    if (!searchTerm.trim()) return news
    const searchLower = searchTerm.toLowerCase()
    return news.filter(item =>
      item.titulo.toLowerCase().includes(searchLower) ||
      item.categoria.toLowerCase().includes(searchLower)
    )
  }, [news, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentNews = filteredNews.slice(startIndex, endIndex)

  useEffect(() => {
    loadNews()
  }, [])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadNews = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await newsService.listNews()
      setNews(data)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingNews(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: NoticiaInIndex) => {
    setEditingNews(item)
    setIsModalOpen(true)
  }

  const handleDelete = (item: NoticiaInIndex) => {
    setDeletingNews(item)
  }

  const confirmDelete = async () => {
    if (!deletingNews) return
    
    try {
      setSaving(true)
      await newsService.deleteNews(deletingNews.id)
      setDeletingNews(null)
      await loadNews()
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setIsModalOpen(false)
    setEditingNews(null)
    await loadNews()
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
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
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Noticias</h1>
            <p className="text-gray-600 mt-2">
              Administra el contenido de noticias del portal
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por título o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none w-full md:w-64"
              />
            </div>

            {canManageNews && (
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} />
                Nueva Noticia
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Tabla de Noticias */}
        {news.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Image size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No hay noticias creadas aún</p>
            {canManageNews && (
              <button
                onClick={handleCreate}
                className="mt-4 btn-secondary"
              >
                Crear primera noticia
              </button>
            )}
          </div>
          ) : (
          <div>
            {/* Results count */}
            {searchTerm && (
              <p className="text-sm text-gray-600 mb-4">
                {filteredNews.length} resultado(s) para "{searchTerm}"
              </p>
            )}
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Título</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Categoría</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Fecha</th>
                    {canManageNews && (
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentNews.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">
                          {item.titulo}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {formatDate(item.fecha)}
                      </td>
                      {canManageNews && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                              aria-label="Editar noticia"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                              aria-label="Eliminar noticia"
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
          </div>
        )}
      </div>

      {/* Modal de Formulario */}
      <NewsFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingNews(null)
        }}
        onSave={handleSave}
        newsId={editingNews?.id}
      />

      {/* Modal de Confirmación de Eliminación */}
      {deletingNews && (
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
                  ¿Estás seguro de eliminar "{deletingNews.titulo}"?
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Esta acción no se puede deshacer. La noticia y su imagen serán eliminadas permanentemente.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingNews(null)}
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
