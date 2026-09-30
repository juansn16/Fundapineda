import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function VerificationBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user || user.is_verified) return null

  return (
    <div
      className="bg-yellow-50 border-b border-yellow-200 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="container-custom flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">Tu correo no ha sido verificado.</span>
          {' '}Te enviamos un código de 6 dígitos. Si no lo recibiste o expiró, puedes
          solicitar uno nuevo.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/profile?verificar=1')}
          className="self-start sm:self-auto text-sm font-medium text-yellow-900 underline underline-offset-2 hover:text-yellow-700 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Iniciar verificación
        </button>
      </div>
    </div>
  )
}
