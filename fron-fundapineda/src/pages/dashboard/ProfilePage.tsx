import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Pencil, Save, X, Send } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { userService } from '../../lib/userService'
import { UsuarioPerfil } from '../../lib/auth'
import { extractErrorMessage } from '../../lib/errorUtils'
import { Field } from '../../components/Field'

const profileSchema = z.object({
  email: z.string().email('Email invalido').optional(),
  telefono: z.string().min(10, 'Telefono debe tener al menos 10 digitos').optional(),
  pais: z.string().min(3, 'Pais requerido').optional(),
  estado: z.string().min(3, 'Estado requerido').optional(),
  ciudad: z.string().min(3, 'Ciudad requerida').optional(),
  direccion: z.string().min(3, 'Direccion requerida').optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UsuarioPerfil | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Verification states
  const [requestingCode, setRequestingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const inputCodigoRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    loadProfile()
  }, [])

  // Si se llega desde el banner de verificacion, baja a la seccion y enfoca el
  // campo del codigo para no obligar a buscarla a mano.
  useEffect(() => {
    if (searchParams.get('verificar') !== '1') return
    const seccion = document.getElementById('verificacion')
    if (!seccion) return
    seccion.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputCodigoRef.current?.focus()
  }, [searchParams, profile])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await userService.getProfile()
      setProfile(data)
      
      // Pre-fill form
      setValue('email', data.email)
      setValue('telefono', data.persona?.telefono || '')
      if (data.persona?.ubicacion) {
        setValue('pais', data.persona.ubicacion.pais)
        setValue('estado', data.persona.ubicacion.estado)
        setValue('ciudad', data.persona.ubicacion.ciudad)
        setValue('direccion', data.persona.ubicacion.direccion)
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      reset()
      if (profile) {
        setValue('email', profile.email)
        setValue('telefono', profile.persona?.telefono || '')
        if (profile.persona?.ubicacion) {
          setValue('pais', profile.persona.ubicacion.pais)
          setValue('estado', profile.persona.ubicacion.estado)
          setValue('ciudad', profile.persona.ubicacion.ciudad)
          setValue('direccion', profile.persona.ubicacion.direccion)
        }
      }
    }
    setIsEditing(!isEditing)
    setError('')
    setSuccess('')
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const updateData: any = {}
      if (data.email && data.email !== profile?.email) updateData.email = data.email
      if (data.telefono && data.telefono !== profile?.persona?.telefono) updateData.telefono = data.telefono
      
      if (data.pais && data.estado && data.ciudad && data.direccion) {
        updateData.direccion = {
          pais: data.pais,
          estado: data.estado,
          ciudad: data.ciudad,
          direccion: data.direccion
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        setSuccess('No hay cambios para guardar')
        setIsEditing(false)
        return
      }
      
      await userService.updateProfile(updateData)
      setSuccess('Perfil actualizado correctamente')
      setIsEditing(false)
      
      // Reload profile and refresh auth context
      await loadProfile()
      await refreshUser()
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRequestCode = async () => {
    try {
      setRequestingCode(true)
      setError('')
      await userService.requestVerificationCode()
      setSuccess('Codigo enviado a tu correo electronico')
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setRequestingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('El codigo debe tener 6 digitos')
      return
    }
    
    try {
      setVerifying(true)
      setError('')
      await userService.verifyCode({ code: verificationCode })
      setSuccess('Correo verificado exitosamente')
      setVerificationCode('')
      await loadProfile()
      await refreshUser()
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setVerifying(false)
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
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            {profile?.is_verified !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                {profile.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle size={16} />
                    Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <AlertCircle size={16} />
                    Pendiente de verificacion
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={handleEditToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isEditing 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {isEditing ? <X size={18} /> : <Pencil size={18} />}
            {isEditing ? 'Cancelar' : 'Actualizar datos'}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Personal Data (Read-only) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Datos Personales
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Cedula</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{profile?.persona?.cedula || 'N/A'}</p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Nombre</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {profile?.persona?.nombre} {profile?.persona?.apellido}
                </p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Fecha de Nacimiento</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{profile?.persona?.fecha_nacimiento || 'N/A'}</p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Genero</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {profile?.persona?.genero === 'M' ? 'Masculino' : 'Femenino'}
                </p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Nacionalidad</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{profile?.persona?.nacionalidad || 'N/A'}</p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-600 mb-1">Familia</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{profile?.persona?.nombre_familia || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contact Data (Editable) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail size={20} />
              Datos de Contacto
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label={`Email ${!profile?.is_verified ? '(Cambiar requiere re-verificación)' : ''}`}
                htmlFor="perfil-email"
                error={errors.email?.message}
                labelClassName="block text-sm font-medium text-gray-600 mb-1"
                errorClassName="text-red-500 text-sm mt-1"
              >
                <input
                  {...register('email')}
                  id="perfil-email"
                  type="email"
                  disabled={!isEditing}
                  aria-invalid={errors.email ? 'true' : undefined}
                  aria-describedby={errors.email ? 'perfil-email-error' : undefined}
                  className={`w-full p-3 rounded-lg border ${
                    isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                  } outline-none transition-colors`}
                />
              </Field>
              <Field
                label="Telefono"
                htmlFor="perfil-telefono"
                error={errors.telefono?.message}
                labelClassName="block text-sm font-medium text-gray-600 mb-1"
                errorClassName="text-red-500 text-sm mt-1"
              >
                <input
                  {...register('telefono')}
                  id="perfil-telefono"
                  type="tel"
                  disabled={!isEditing}
                  aria-invalid={errors.telefono ? 'true' : undefined}
                  aria-describedby={errors.telefono ? 'perfil-telefono-error' : undefined}
                  className={`w-full p-3 rounded-lg border ${
                    isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                  } outline-none transition-colors`}
                />
              </Field>
            </div>
          </div>

          {/* Address (Editable) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Direccion
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label="Pais"
                htmlFor="perfil-pais"
                error={errors.pais?.message}
                labelClassName="block text-sm font-medium text-gray-600 mb-1"
                errorClassName="text-red-500 text-sm mt-1"
              >
                <input
                  {...register('pais')}
                  id="perfil-pais"
                  type="text"
                  disabled={!isEditing}
                  aria-invalid={errors.pais ? 'true' : undefined}
                  aria-describedby={errors.pais ? 'perfil-pais-error' : undefined}
                  className={`w-full p-3 rounded-lg border ${
                    isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                  } outline-none transition-colors`}
                />
              </Field>
              <Field
                label="Estado"
                htmlFor="perfil-estado"
                error={errors.estado?.message}
                labelClassName="block text-sm font-medium text-gray-600 mb-1"
                errorClassName="text-red-500 text-sm mt-1"
              >
                <input
                  {...register('estado')}
                  id="perfil-estado"
                  type="text"
                  disabled={!isEditing}
                  aria-invalid={errors.estado ? 'true' : undefined}
                  aria-describedby={errors.estado ? 'perfil-estado-error' : undefined}
                  className={`w-full p-3 rounded-lg border ${
                    isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                  } outline-none transition-colors`}
                />
              </Field>
              <Field
                label="Ciudad"
                htmlFor="perfil-ciudad"
                error={errors.ciudad?.message}
                labelClassName="block text-sm font-medium text-gray-600 mb-1"
                errorClassName="text-red-500 text-sm mt-1"
              >
                <input
                  {...register('ciudad')}
                  id="perfil-ciudad"
                  type="text"
                  disabled={!isEditing}
                  aria-invalid={errors.ciudad ? 'true' : undefined}
                  aria-describedby={errors.ciudad ? 'perfil-ciudad-error' : undefined}
                  className={`w-full p-3 rounded-lg border ${
                    isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                  } outline-none transition-colors`}
                />
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="Direccion"
                  htmlFor="perfil-direccion"
                  error={errors.direccion?.message}
                  labelClassName="block text-sm font-medium text-gray-600 mb-1"
                  errorClassName="text-red-500 text-sm mt-1"
                >
                  <input
                    {...register('direccion')}
                    id="perfil-direccion"
                    type="text"
                    disabled={!isEditing}
                    aria-invalid={errors.direccion ? 'true' : undefined}
                    aria-describedby={errors.direccion ? 'perfil-direccion-error' : undefined}
                    className={`w-full p-3 rounded-lg border ${
                      isEditing ? 'border-gray-300 focus:border-primary' : 'border-transparent bg-gray-50'
                    } outline-none transition-colors`}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Verification Section */}
        {!profile?.is_verified && (
          <div
            id="verificacion"
            className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg scroll-mt-24"
          >
            <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              Verificacion de Correo
            </h3>
            <p className="text-yellow-800 text-sm mb-4">
              Te enviamos un código de 6 dígitos al registrarte. Pégalo aquí para
              activar tu cuenta, o solicita uno nuevo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={requestingCode}
                className="btn-secondary flex items-center gap-2"
              >
                {requestingCode ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Solicitar Codigo
                  </>
                )}
              </button>
              
              <div className="flex gap-2 flex-1">
                <label htmlFor="codigo-verificacion" className="sr-only">
                  Código de verificación de 6 dígitos
                </label>
                <input
                  id="codigo-verificacion"
                  ref={inputCodigoRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Código de 6 dígitos"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="flex-1 p-3 rounded-lg border border-yellow-300 focus:border-yellow-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || verificationCode.length !== 6}
                  className="btn-primary"
                >
                  {verifying ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Verificar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
