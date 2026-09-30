import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../lib/errorUtils'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'
import { Field } from '../components/Field'

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  usePageMeta({
    title: PAGE_TITLES.login,
    description: "Inicia sesion en el panel de la Fundacion Gustavo Pineda para consultar tu adscripcion, descargar documentos y verificar tu correo.",
    path: '/login',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      const result = await login(data.email, data.password)
      
      if (result.success && result.redirectTo) {
        navigate(result.redirectTo)
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen py-20 md:py-28 bg-gray-50 flex items-center justify-center">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <img 
                src="/logo.jpeg" 
                alt="Fundación Pineda" 
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
              <h1 className="text-2xl font-bold text-primary font-heading">
                Iniciar Sesión
              </h1>
              <p className="text-secondary text-sm mt-2">
                Accede a tu cuenta del sistema P.A.A.I.S.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-accent/10 border border-accent rounded-lg">
                <p className="text-accent text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Field
                label="Correo Electrónico"
                htmlFor="login-email"
                error={errors.email?.message}
                required
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    {...register('email')}
                    id="login-email"
                    type="email"
                    aria-invalid={errors.email ? 'true' : undefined}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 
                           focus:border-primary focus:ring-2 focus:ring-primary/20 
                           outline-none transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </Field>

              <Field
                label="Contraseña"
                htmlFor="login-password"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    {...register('password')}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    aria-invalid={errors.password ? 'true' : undefined}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-200 
                           focus:border-primary focus:ring-2 focus:ring-primary/20 
                           outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  'Iniciando...'
                ) : (
                  <>
                    <LogIn size={18} />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-secondary text-sm">
                ¿No tienes cuenta?{' '}
                <Link to="/adscripcion" className="text-primary font-medium hover:underline">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}