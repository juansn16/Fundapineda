import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Calendar, Tag, ArrowLeft, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { newsService, NoticiaInIndex } from '../lib/newsService'
import { NewsCard } from '../components/NewsCard'
import { extractErrorMessage } from '../lib/errorUtils'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

export function NewsPage() {
  usePageMeta({
    title: PAGE_TITLES.news,
    description:
      'Noticias y comunicados de la Fundación Gustavo Pineda sobre salud, programas y actividades del P.A.A.I.S. en Maracaibo, Zulia.',
    path: '/noticias',
  })

  const [news, setNews] = useState<NoticiaInIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  // Fetch news
  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await newsService.listNews(true)
        setNews(data)
      } catch (err: unknown) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    loadNews()
  }, [])

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
  const currentNews = filteredNews.slice(startIndex, startIndex + itemsPerPage)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
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
      className="max-w-6xl mx-auto py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Noticias</h1>
        <p className="text-gray-600 mt-2">
          Mantente informado sobre las últimas noticias
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar noticias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:outline-none w-full"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            {filteredNews.length} resultado(s) para "{searchTerm}"
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* News Grid */}
      {currentNews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No se encontraron noticias</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentNews.map((item, index) => (
            <NewsCard key={item.id} news={item} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </motion.div>
  )
}
