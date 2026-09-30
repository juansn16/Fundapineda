import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import { newsService, NoticiaResponse } from '../lib/newsService'
import { extractErrorMessage } from '../lib/errorUtils'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [news, setNews] = useState<NoticiaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  usePageMeta({
    title: news ? news.titulo : PAGE_TITLES.newsDetail,
    description: news
      ? news.resumen || news.contenido.replace(/<[^>]+>/g, '').slice(0, 155)
      : 'Cargando la noticia...',
    path: id ? `/noticias/${id}` : '/noticias',
    ogType: 'article',
    article: news
      ? {
          publishedTime: news.fecha,
          author: 'Fundación Gustavo Pineda',
        }
      : undefined,
  })

  useEffect(() => {
    if (!id) return

    const loadNews = async () => {
      try {
        setLoading(true)
        setError('')
        // Include image as base64 for detail page
        const data = await newsService.getNews(id, true)
        setNews(data)
      } catch (err: unknown) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    loadNews()
  }, [id])

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

  if (error || !news) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Noticia no encontrada'}</p>
        <Link to="/noticias" className="btn-primary">
          Volver a Noticias
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8"
    >
      {/* Back Button */}
      <Link
        to="/noticias"
        className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
      >
        <ArrowLeft size={16} />
        Volver a Noticias
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Tag size={14} />
            {news.categoria}
          </span>
          <span className="text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(news.fecha)}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {news.titulo}
        </h1>
      </div>

      {/* Image */}
      <div className="mb-8 rounded-2xl overflow-hidden">
        {news.imagen_base64 ? (
          <img
            src={`data:${news.imagen_media_type || 'image/webp'};base64,${news.imagen_base64}`}
            alt={news.titulo}
            className="w-full max-h-96 object-cover"
          />
        ) : (
          <img
            src={news.url_imagen}
            alt={news.titulo}
            className="w-full max-h-96 object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-4 italic">{news.resumen}</p>
        <div className="text-gray-800 whitespace-pre-wrap">{news.contenido}</div>
      </div>
    </motion.div>
  )
}
