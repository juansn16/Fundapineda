import { motion } from 'framer-motion'
import { Calendar, Tag } from 'lucide-react'
import { NoticiaInIndex } from '../lib/newsService'

interface NewsCardProps {
  news: NoticiaInIndex
  index: number
}

export function NewsCard({ news, index }: NewsCardProps) {
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

  const getImageSrc = () => {
    if (news.imagen_base64) {
      return `data:${news.imagen_media_type};base64,${news.imagen_base64}`
    }
    if (news.url_imagen?.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${news.url_imagen}`
    }
    return news.url_imagen
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
    >
      <a href={`/noticias/${news.id}`} className="block">
        {/* Image */}
        <div className="h-48 overflow-hidden">
          <img
            src={getImageSrc()}
            alt={news.titulo}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Tag size={12} />
              {news.categoria}
            </span>
            <span className="text-sm text-gray-500 ml-auto flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(news.fecha)}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {news.titulo}
          </h3>
          
          {/* Note: resumen not available in NoticiaInIndex from backend */}
        </div>
      </a>
    </motion.div>
  )
}
