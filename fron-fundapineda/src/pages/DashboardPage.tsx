import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileText, Newspaper, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../lib/auth'
import { extractErrorMessage } from '../lib/errorUtils'

export function DashboardPage() {
  const { user, hasRole } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const getInitials = () => {
    if (user?.persona?.nombre && user?.persona?.apellido) {
      return `${user.persona.nombre[0]}${user.persona.apellido[0]}`.toUpperCase()
    }
    return user?.email?.[0].toUpperCase() || 'U'
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true)
      setError('')
      const blob = await authService.downloadAdscripcion()
      
      // Verificar si la respuesta es un error en JSON
      const contentType = blob.type
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(await blob.text())
        throw new Error(errorData.detail || 'Error en el servidor')
      }
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Adscripcion_${user?.persona?.cedula || 'documento'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      console.error('Error descargando PDF:', err)
      const errorMessage = extractErrorMessage(err)
      
      if (errorMessage.includes('no se encuentra') || errorMessage.includes('no encontrado') || errorMessage.includes('not found')) {
        setError('El documento de adscripción no se encuentra en el servidor. Por favor, contacta a soporte técnico.')
      } else {
        setError(errorMessage + '. Por favor, intenta de nuevo o contacta a soporte.')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header de Bienvenida */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.persona?.nombre || 'Usuario'}
        </h1>
        <p className="text-gray-600 mt-2">
          Panel de control del sistema P.A.A.I.S.
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Tarjeta de Perfil */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{getInitials()}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {user?.persona?.nombre} {user?.persona?.apellido}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {user?.is_verified ? (
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
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>{user?.persona?.cedula && `Cédula: ${user.persona.cedula}`}</p>
            <p>{user?.persona?.telefono && `Tel: ${user.persona.telefono}`}</p>
            <p>{user?.persona?.nombre_familia && `Familia: ${user.persona.nombre_familia}`}</p>
          </div>
        </div>

        {/* Tarjeta de Documento de Adscripción - Visible para todos los usuarios */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Documento de Adscripción</h3>
              <p className="text-sm text-gray-600">Descarga tu documento</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Descarga una copia de tu documento de adscripción firmado.
          </p>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Descargando...
              </>
            ) : (
              <>
                <Download size={18} />
                Descargar PDF
              </>
            )}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Tarjeta de Noticias (solo para periodistas/admins) */}
        {hasRole(['creador_contenido', 'administrador']) && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Newspaper className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gestión de Noticias</h3>
                <p className="text-sm text-gray-600">Administra el contenido</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Crea, edita y elimina noticias del portal.
            </p>
            <a
              href="/dashboard/news"
              className="btn-secondary w-full text-center block"
            >
              Ir a Noticias
            </a>
          </div>
        )}
      </div>

      {/* Feed de Noticias Recientes (para periodistas) */}
      {hasRole(['creador_contenido', 'administrador']) && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Noticias Recientes</h3>
          <p className="text-gray-600 text-sm">
            Las últimas noticias aparecerán aquí. Usa el panel de gestión para crear contenido.
          </p>
        </div>
      )}
    </motion.div>
  )
}
