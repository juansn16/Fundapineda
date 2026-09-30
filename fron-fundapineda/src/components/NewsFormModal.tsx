import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload } from 'lucide-react'
import api from '../lib/api'
import { newsService, NoticiaResponse } from '../lib/newsService'
import { extractErrorMessage } from '../lib/errorUtils'
import { Field } from './Field'

interface NewsFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  newsId?: string // Si se pasa, es edición
}

export function NewsFormModal({ isOpen, onClose, onSave, newsId }: NewsFormModalProps) {
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [resumen, setResumen] = useState('')
  const [contenido, setContenido] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!newsId

  useEffect(() => {
    if (newsId) {
      // Cargar datos de la noticia INCLUYENDO la imagen
      newsService.getNews(newsId, true)
        .then((data: NoticiaResponse) => {
          setTitulo(data.titulo)
          setCategoria(data.categoria)
          setResumen(data.resumen)
          setContenido(data.contenido)
          
          // Si viene con imagen en base64, crear preview
          if (data.imagen_base64) {
            const base64String = `data:${data.imagen_media_type};base64,${data.imagen_base64}`
            setPreviewUrl(base64String)
            
            // Convertir base64 a File para edición
            fetch(base64String)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], 'imagen.webp', { type: 'image/webp' })
                setImage(file)
              })
          } else {
            setPreviewUrl(data.url_imagen)
          }
        })
        .catch((err: unknown) => setError(extractErrorMessage(err)))
    } else {
      setTitulo('')
      setCategoria('')
      setResumen('')
      setContenido('')
      setImage(null)
      setPreviewUrl(null)
    }
    setError('')
  }, [newsId, isOpen])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!titulo.trim() || titulo.length < 3) {
      setError('El título debe tener al menos 3 caracteres')
      return
    }
    if (!categoria.trim() || categoria.length < 3) {
      setError('La categoría debe tener al menos 3 caracteres')
      return
    }
    if (!resumen.trim() || resumen.length < 10) {
      setError('El resumen debe tener al menos 10 caracteres')
      return
    }
    if (!contenido.trim() || contenido.length < 10) {
      setError('El contenido debe tener al menos 10 caracteres')
      return
    }
    if (!isEditing && !image) {
      setError('La imagen es requerida para crear una noticia')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('titulo', titulo)
      formData.append('categoria', categoria)
      formData.append('contenido', contenido)
      formData.append('resumen', resumen)
      if (image) {
        formData.append('image', image)
      }

      if (isEditing && newsId) {
        await api.put(`/noticias/${newsId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post(`/noticias/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onSave()
      onClose()
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Noticia' : 'Nueva Noticia'}
              </h2>
              <button
                onClick={onClose}
                aria-label="Cerrar ventana"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Título */}
              <div className="mb-4">
                <Field label="Título" htmlFor="noticia-titulo" required>
                  <input
                    id="noticia-titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                    placeholder="Título de la noticia"
                  />
                </Field>
              </div>

              {/* Categoría */}
              <div className="mb-4">
                <Field label="Categoría" htmlFor="noticia-categoria" required>
                  <input
                    id="noticia-categoria"
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                    placeholder="Ej: Comunidad, Salud, Educación"
                  />
                </Field>
              </div>

              {/* Resumen */}
              <div className="mb-4">
                <Field label={`Resumen (${resumen.length}/500)`} htmlFor="noticia-resumen" required>
                  <textarea
                    id="noticia-resumen"
                    value={resumen}
                    onChange={(e) => setResumen(e.target.value.slice(0, 500))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:outline-none resize-none"
                    placeholder="Resumen breve de la noticia (máximo 500 caracteres)"
                  />
                </Field>
              </div>

              {/* Contenido */}
              <div className="mb-4">
                <Field label="Contenido" htmlFor="noticia-contenido" required>
                  <textarea
                    id="noticia-contenido"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:outline-none resize-none"
                    placeholder="Contenido completo de la noticia"
                  />
                </Field>
              </div>

              {/* Imagen */}
              <div className="mb-6">
                <Field label="Imagen" htmlFor="noticia-imagen" required={!isEditing}>
                  <input
                    id="noticia-imagen"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                  />
                </Field>
                {previewUrl && (
                  <div className="mt-3">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {isEditing ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
