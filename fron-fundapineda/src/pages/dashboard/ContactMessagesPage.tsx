import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  MailCheck,
} from 'lucide-react'
import { contactService, ContactMessageItem } from '../../lib/contactService'
import { extractErrorMessage } from '../../lib/errorUtils'

function formatFecha(fecha: string) {
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return fecha
  return date.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ContactMessagesPage() {
  const [mensajes, setMensajes] = useState<ContactMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState<ContactMessageItem | null>(null)

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await contactService.list()
      setMensajes(data.mensajes)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleMarkRead = async (msg: ContactMessageItem) => {
    try {
      setSaving(true)
      setError('')
      await contactService.markRead(msg.id)
      setMensajes(prev =>
        prev.map(m => (m.id === msg.id ? { ...m, leido: true } : m))
      )
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      setSaving(true)
      setError('')
      await contactService.remove(deleting.id)
      setMensajes(prev => prev.filter(m => m.id !== deleting.id))
      setSuccess('Mensaje eliminado correctamente')
      setDeleting(null)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const unreadCount = mensajes.filter(m => !m.leido).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary font-heading">
            Mensajes de Contacto
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Mensajes enviados desde el formulario de contacto.
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
            <MailCheck size={16} />
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : mensajes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400">
          <Inbox size={40} />
          <p className="text-sm">No hay mensajes por ahora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mensajes.map(msg => (
            <div
              key={msg.id}
              className={`bg-white rounded-2xl shadow-sm border p-6 ${
                msg.leido ? 'border-gray-100' : 'border-amber-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{msg.nombre}</h3>
                      {!msg.leido && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                          No leído
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{formatFecha(msg.fecha)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!msg.leido && (
                    <button
                      onClick={() => handleMarkRead(msg)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Marcar como leído
                    </button>
                  )}
                  <button
                    onClick={() => setDeleting(msg)}
                    disabled={saving}
                    aria-label={`Eliminar mensaje de ${msg.nombre}`}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <a
                  href={`mailto:${msg.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Mail size={15} />
                  {msg.email}
                </a>
                {msg.telefono && (
                  <a
                    href={`tel:${msg.telefono.replace(/[^+\d]/g, '')}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone size={15} />
                    {msg.telefono}
                  </a>
                )}
              </div>

              <p className="mt-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                {msg.mensaje}
              </p>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Eliminar mensaje</h3>
            <p className="text-sm text-gray-600">
              ¿Seguro que deseas eliminar el mensaje de{' '}
              <span className="font-medium">{deleting.nombre}</span>? Esta acción no se
              puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}