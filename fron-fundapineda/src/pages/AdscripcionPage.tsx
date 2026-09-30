import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Check, Upload, Camera,
  AlertCircle, User, FileText, Lock, Eye, EyeOff, Loader2
} from 'lucide-react'
import { authService, RegistroCompleto } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'
import api from '../lib/api'
import { extractErrorMessage } from '../lib/errorUtils'
import { Field } from '../components/Field'

const step1Schema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  cedula: z.string().min(5, 'Ingresa una cédula válida'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  genero: z.string().min(1, 'Selecciona un género'),
  telefono: z.string().min(10, 'Ingresa un teléfono válido'),
})

const step2Schema = z.object({
  nacionalidad: z.string().min(1, 'Selecciona tu nacionalidad'),
  nombreFamilia: z.string().min(2, 'El nombre de familia debe tener al menos 2 caracteres'),
})

const step3Schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmData: z.boolean().refine(val => val === true, 'Debes confirmar que los datos son correctos'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

interface AdscripcionFormData extends Step1Data, Step2Data, Step3Data {
  tempSignatureName?: string
}

const countries = [
  'Venezolana', 'Colombiana', 'Española', 'Estadounidense', 'Mexicana',
  'Argentina', 'Chilena', 'Ecuatoriana', 'Peruana', 'Brasileña'
]

const generos = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
]

const steps = [
  { id: 1, title: 'Datos Personales', icon: User },
  { id: 2, title: 'Documento Legal', icon: FileText },
  { id: 3, title: 'Confirmación', icon: Lock },
]

const inputClass = 'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all'

export function AdscripcionPage() {
  usePageMeta({
    title: PAGE_TITLES.signup,
    description:
      'Adscribete gratis al programa P.A.A.I.S. de la Fundacion Gustavo Pineda. Completa el registro en linea, firma digitalmente y descarga tu carta de adscripcion.',
    path: '/adscripcion',
  })

  const navigate = useNavigate()
  const { adoptSession } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<AdscripcionFormData>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [firmaType, setFirmaType] = useState<'upload' | 'camera' | null>(null)
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [registroExitoso, setRegistroExitoso] = useState(false)
  const [verificacionEnviada, setVerificacionEnviada] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { control: controlStep1, handleSubmit: handleSubmitStep1, formState: { errors: errorsStep1 } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      nombre: formData.nombre || '',
      apellido: formData.apellido || '',
      cedula: formData.cedula || '',
      fechaNacimiento: formData.fechaNacimiento || '',
      genero: formData.genero || '',
      telefono: formData.telefono || '',
    }
  })

  const { control: controlStep2, handleSubmit: handleSubmitStep2, formState: { errors: errorsStep2 }, watch: watchStep2 } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      nacionalidad: formData.nacionalidad || '',
      nombreFamilia: formData.nombreFamilia || '',
    }
  })

  const { control: controlStep3, handleSubmit: handleSubmitStep3, formState: { errors: errorsStep3 }, watch: watchStep3 } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      email: formData.email || '',
      password: formData.password || '',
      confirmData: formData.confirmData || false,
    }
  })

  const handleStep1Submit = (data: Step1Data) => {
    setFormData(prev => ({ ...prev, ...data }))
    setCurrentStep(2)
  }

  const processFirma = async (file: File): Promise<{ temp_file_name: string; preview_base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          setIsProcessing(true)
          setError('')
          const result = await authService.procesarFirma(file)
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          setIsProcessing(false)
        }
      }
      reader.onerror = () => reject(new Error('Error al leer la imagen'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const result = await processFirma(file)
        setFormData(prev => ({ ...prev, tempSignatureName: result.temp_file_name }))
        setFirmaPreview(result.preview_base64)
        setFirmaType('upload')
      } catch {
        setError('Error al procesar la firma. Intenta con otra imagen.')
      }
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraStream(stream)
      setFirmaType('camera')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'firma.jpg', { type: 'image/jpeg' })
            try {
              const result = await processFirma(file)
              setFormData(prev => ({ ...prev, tempSignatureName: result.temp_file_name }))
              setFirmaPreview(result.preview_base64)
            } catch {
              setError('Error al procesar la foto')
            }
          }
        }, 'image/jpeg')
      }
    }
    stopCamera()
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  const handleStep2Submit = (data: Step2Data) => {
    if (!formData.tempSignatureName) {
      setError('Debes subir tu firma antes de continuar')
      return
    }
    setFormData(prev => ({ ...prev, ...data }))
    setCurrentStep(3)
  }

  const handleStep3Submit = async (data: Step3Data) => {
    setIsSubmitting(true)
    setError('')

    const userAgent = navigator.userAgent

    try {
      const payload: RegistroCompleto = {
        persona: {
          cedula: formData.cedula || '',
          nombre: formData.nombre || '',
          apellido: formData.apellido || '',
          fecha_nacimiento: formData.fechaNacimiento || '',
          genero: (formData.genero as 'M' | 'F') || 'M',
          nacionalidad: formData.nacionalidad || 'Venezolana',
          telefono: formData.telefono || '',
          nombre_familia: formData.nombreFamilia || '',
        },
        usuario: {
          email: data.email,
          password: data.password,
        },
        adscripcion: {
          fecha_firma: new Date().toISOString().split('T')[0],
        },
        temp_signature_name: formData.tempSignatureName || '',
      }

      const response = await api.post('/auth/register', payload)

      setVerificacionEnviada(response.data?.verificacion_enviada !== false)

      // adoptSession deja los tokens y, sobre todo, actualiza el estado en
      // memoria del AuthProvider. Escribir solo en localStorage no basta:
      // ProtectedRoute leeria user === null y devolveria al usuario al login.
      await adoptSession(response.data.access_token, response.data.refresh_token)

      setRegistroExitoso(true)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  const selectedNacionalidad = watchStep2('nacionalidad')
  const selectedNombreFamilia = watchStep2('nombreFamilia')

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  useEffect(() => {
    if (!registroExitoso) return
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 5000)
    return () => clearTimeout(timer)
  }, [registroExitoso, navigate])

  if (registroExitoso) {
    return (
      <div className="min-h-screen py-20 md:py-28 bg-gray-50 flex items-center">
        <div className="container-custom max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-10 text-center"
          >
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
              role="img"
              aria-label="Inscripción completada"
            >
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 font-heading mb-4">
              ¡Inscripción completada!
            </h1>

            <p className="text-gray-600 mb-6">
              Tu carta de adscripción está lista y ya puedes descargarla desde tu panel.
            </p>

            {verificacionEnviada ? (
              <p className="text-sm text-gray-500 mb-8">
                Te enviamos un código de 6 dígitos a tu correo para verificar tu cuenta.
              </p>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-8">
                No pudimos enviar el correo de verificación. Puedes solicitar un nuevo
                código desde tu panel.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Ir a mi panel
              </button>
              <button
                onClick={() => navigate('/dashboard/profile?verificar=1', { replace: true })}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Verificar mi correo
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-6" aria-live="polite">
              Redirigiendo a tu panel en unos segundos...
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20 md:py-28 bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-heading mb-6">
            Adscripción al P.A.A.I.S.
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            Únete a nuestro programa de salud. Completa el siguiente proceso
            de inscripción gratuito.
          </p>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto">
          <div className="bg-primary px-8 py-6">
            <div className="flex items-center justify-between overflow-x-auto">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex items-center gap-3 ${
                      step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.id
                        ? 'bg-white text-primary'
                        : currentStep === step.id
                        ? 'bg-white text-primary ring-4 ring-white/30'
                        : 'bg-white/20 text-white'
                    }`}>
                      {currentStep > step.id ? <Check size={20} /> : <step.icon size={20} />}
                    </div>
                    <span className={`hidden md:block font-medium text-sm ${
                      currentStep >= step.id ? 'text-white' : 'text-white/60'
                    }`}>
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-white' : 'bg-white/30'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold text-primary font-heading mb-6">
                    Datos Personales
                  </h2>
                  <form onSubmit={handleSubmitStep1(handleStep1Submit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Field
                        label="Nombre"
                        htmlFor="adscripcion-nombre"
                        error={errorsStep1.nombre?.message}
                        required
                      >
                        <input
                          {...controlStep1.register('nombre')}
                          id="adscripcion-nombre"
                          type="text"
                          aria-invalid={errorsStep1.nombre ? 'true' : undefined}
                          aria-describedby={errorsStep1.nombre ? 'adscripcion-nombre-error' : undefined}
                          className={inputClass}
                          placeholder="Tu nombre"
                        />
                      </Field>
                      <Field
                        label="Apellido"
                        htmlFor="adscripcion-apellido"
                        error={errorsStep1.apellido?.message}
                        required
                      >
                        <input
                          {...controlStep1.register('apellido')}
                          id="adscripcion-apellido"
                          type="text"
                          aria-invalid={errorsStep1.apellido ? 'true' : undefined}
                          aria-describedby={errorsStep1.apellido ? 'adscripcion-apellido-error' : undefined}
                          className={inputClass}
                          placeholder="Tu apellido"
                        />
                      </Field>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Field
                        label="Cédula"
                        htmlFor="adscripcion-cedula"
                        error={errorsStep1.cedula?.message}
                        required
                      >
                        <input
                          {...controlStep1.register('cedula')}
                          id="adscripcion-cedula"
                          type="text"
                          aria-invalid={errorsStep1.cedula ? 'true' : undefined}
                          aria-describedby={errorsStep1.cedula ? 'adscripcion-cedula-error' : undefined}
                          className={inputClass}
                          placeholder="Ej: 12345678"
                        />
                      </Field>
                      <Field
                        label="Fecha de Nacimiento"
                        htmlFor="adscripcion-fechaNacimiento"
                        error={errorsStep1.fechaNacimiento?.message}
                        required
                      >
                        <input
                          {...controlStep1.register('fechaNacimiento')}
                          id="adscripcion-fechaNacimiento"
                          type="date"
                          aria-invalid={errorsStep1.fechaNacimiento ? 'true' : undefined}
                          aria-describedby={errorsStep1.fechaNacimiento ? 'adscripcion-fechaNacimiento-error' : undefined}
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Field
                        label="Género"
                        htmlFor="adscripcion-genero"
                        error={errorsStep1.genero?.message}
                        required
                      >
                        <select
                          {...controlStep1.register('genero')}
                          id="adscripcion-genero"
                          aria-invalid={errorsStep1.genero ? 'true' : undefined}
                          aria-describedby={errorsStep1.genero ? 'adscripcion-genero-error' : undefined}
                          className={inputClass}
                        >
                          <option value="">Selecciona...</option>
                          {generos.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Teléfono"
                        htmlFor="adscripcion-telefono"
                        error={errorsStep1.telefono?.message}
                        required
                      >
                        <input
                          {...controlStep1.register('telefono')}
                          id="adscripcion-telefono"
                          type="tel"
                          aria-invalid={errorsStep1.telefono ? 'true' : undefined}
                          aria-describedby={errorsStep1.telefono ? 'adscripcion-telefono-error' : undefined}
                          className={inputClass}
                          placeholder="+58 412 000-0000"
                        />
                      </Field>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button type="submit" className="btn-primary flex items-center gap-2">
                        Siguiente
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold text-primary font-heading mb-2">
                    Documento Legal
                  </h2>
                  <p className="text-secondary mb-6">
                    Complete los datos para generar la carta de adscripción.
                  </p>

                  <form onSubmit={handleSubmitStep2(handleStep2Submit)} className="space-y-6">
                    <Field
                      label="Nacionalidad"
                      htmlFor="adscripcion-nacionalidad"
                      error={errorsStep2.nacionalidad?.message}
                      required
                    >
                      <select
                        {...controlStep2.register('nacionalidad')}
                        id="adscripcion-nacionalidad"
                        aria-invalid={errorsStep2.nacionalidad ? 'true' : undefined}
                        aria-describedby={errorsStep2.nacionalidad ? 'adscripcion-nacionalidad-error' : undefined}
                        className={inputClass}
                      >
                        <option value="">Selecciona...</option>
                        {countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label="Nombre de Familia"
                      htmlFor="adscripcion-nombreFamilia"
                      error={errorsStep2.nombreFamilia?.message}
                      required
                    >
                      <input
                        {...controlStep2.register('nombreFamilia')}
                        id="adscripcion-nombreFamilia"
                        type="text"
                        aria-invalid={errorsStep2.nombreFamilia ? 'true' : undefined}
                        aria-describedby={errorsStep2.nombreFamilia ? 'adscripcion-nombreFamilia-error' : undefined}
                        className={inputClass}
                        placeholder="Apellido de familia"
                      />
                    </Field>

                    <div>
                      <label htmlFor="adscripcion-firma" className="block text-sm font-medium text-secondary mb-3">
                        Firma *
                      </label>
                      {!firmaType ? (
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                            disabled={isProcessing}
                          >
                            <Upload size={20} />
                            Subir Foto
                          </button>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                            disabled={isProcessing}
                          >
                            <Camera size={20} />
                            Tomar Foto
                          </button>
                        </div>
                      ) : firmaType === 'camera' && cameraStream ? (
                        <div className="space-y-4">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded-lg bg-black"
                          />
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1 btn-primary"
                            >
                              Capturar
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="flex-1 btn-outline"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        id="adscripcion-firma"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {isProcessing && (
                        <p className="text-sm mt-2 text-primary">
                          Procesando imagen...
                        </p>
                      )}
                      {error && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                          <AlertCircle size={16} />
                          {error}
                        </div>
                      )}
                    </div>

                    {firmaPreview && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <img src={firmaPreview} alt="Firma" className="w-24 h-12 object-contain bg-white border" />
                        <button
                          type="button"
                          onClick={() => { setFirmaPreview(null); setFormData(prev => ({ ...prev, tempSignatureName: undefined })) }}
                          className="text-accent text-sm hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-primary font-heading mb-4">
                        Vista Previa del Documento
                      </h3>
                      <div className="bg-white p-8 rounded-lg border text-sm leading-relaxed space-y-4">
                        <p className="font-bold text-center text-base mb-6">
                          CARTA DE MANIFESTACIÓN DE ADSCRIPCIÓN VOLUNTARIA FAMILIAR AL P.A.A.I.S.
                        </p>

                        <p>
                          Yo, <strong>{formData.nombre} {formData.apellido}</strong> de nacionalidad{' '}
                          <strong>{selectedNacionalidad || '_____'}</strong>, portador de la Cedula de
                          Identidad número <strong>{formData.cedula || '_____'}</strong> y del número de
                          Telefonía Celular <strong>{formData.telefono || '_____'}</strong>, en mi
                          condición de Jefe de la familia <strong>{selectedNombreFamilia || '_____'}</strong>,
                          por medio de la presente, manifiesto la voluntad de adscribir a mi núcleo familiar,
                          en calidad de &ldquo;observador&rdquo; al Programa Auto gestionado de Atención
                          Integral de Salud (P.A.A.I.S.) de la Fundación Gustavo Pineda.
                        </p>

                        <p>
                          Entiendo que el referido programa es una iniciativa ciudadana de autogestión de la
                          salud, motivada por la grave situación sanitaria de Venezuela, en la cual resalta
                          la casi desaparición del sistema sanitario público, la minimización de la oferta de
                          servicios de clínicas privadas, &mdash;con la consecuente inaccebilidad de ésta a la
                          gran mayoría de la población&mdash; y a la consecuente conversión de los hogares en
                          centros de hospitalización domiciliaria, con un gasto bolsillo del 100 % para los
                          pacientes y sus familiares.
                        </p>

                        <p>
                          Comprendo que el programa explora nuevas formas de gestión del proceso de salud,
                          como alternativa a los grupos desatendidos, basándose en paradigmas y enfoques
                          alternativos, tales como el auto regentamiento y auto responsabilidad en salud, la
                          integralidad, prevención, actualización y eficiencia.
                        </p>

                        <p>
                          Está claro que el referido proyecto constituye un emprendimiento corporativo donde
                          todos sus participantes, tanto receptores como prestadores de servicios, se
                          constituyen en socios igualitarios, comprometidos por igual en el éxito del mismo.
                          En éste sentido todos los participantes serán accionistas de una Empresa Social de
                          Salud sostenible y sustentable, que si bien utilice métodos y prácticas eficientes
                          de negocio, su fin último no es el de generar utilidades financieras para sus
                          propietarios, sino contribuir en la solución del problema social de la salud,
                          produciendo un superávit que sea reinvertido para expandir el emprendimiento,
                          brindando al mismo tiempo servicios de calidad a los pacientes, lo mismo que
                          salarios de mercado y buenas condiciones laborales para sus trabajadores.
                        </p>

                        <p>
                          Comparto el objetivo del programa de promover y preservar la salud de sus
                          participantes a través de una atención integral, eficaz y digna, para lo cual
                          ejecutará diversos subprogramas que prioricen la Atención Comunitaria Primaria
                          sobre la hospitalaria. En tal sentido, espero junto a mi familia, participar en
                          diversas actividades de Educación para la Salud, Promoción, Prevención, Despistaje
                          Precoz y Rehabilitación, todas las cuales redunden en nuestro bienestar y generen
                          una baja morbilidad o siniestralidad, que igualmente cuente con una total cobertura
                          de atención hospitalaria, con adecuados tiempos de respuesta y atención
                          estandarizada.
                        </p>

                        <p>
                          Ésta es una adscripción a un grupo de dos mil familias, (Diez mil personas) de
                          cualquier sexo, edad, condición morbil pre existente, grupo étnico, estrato
                          socioeconómico, nacionalidad y nivel de instrucción, residenciadas en la ciudad de
                          Maracaibo, Estado Zulia, República Bolivariana de Venezuela, siendo los dos únicos
                          criterios de exclusión, el desplazamiento fuera de la jurisdicción durante más de
                          tres meses y el abandono voluntario formal del programa.
                        </p>

                        <p>
                          Finalmente, ésta manifestación de voluntad, no implica de ninguna manera,
                          compromiso u obligación financiera alguna, por mi parte a algún miembro de mi
                          familia, para con la Fundación Gustavo Pineda o algunos de sus miembros, hasta
                          tanto se haya concretado incorporación formal con la adquisición accionaria y firma
                          del respectivo contrato.
                        </p>

                        <p className="pt-4">
                          En Maracaibo, a la fecha de la adscripción,
                        </p>

                        <p className="font-bold pt-2">
                          El Jefe de familia
                        </p>

                        {firmaPreview && (
                          <div className="pt-2">
                            <img src={firmaPreview} alt="Firma" className="h-16 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="btn-outline flex items-center gap-2"
                      >
                        <ChevronLeft size={18} />
                        Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={!firmaPreview || isProcessing}
                        className="btn-primary flex items-center gap-2"
                      >
                        Siguiente
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold text-primary font-heading mb-6">
                    Confirmación
                  </h2>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmitStep3(handleStep3Submit)} className="space-y-6 max-w-xl">
                    <Field
                      label="Correo Electrónico"
                      htmlFor="adscripcion-email"
                      error={errorsStep3.email?.message}
                      required
                    >
                      <input
                        {...controlStep3.register('email')}
                        id="adscripcion-email"
                        type="email"
                        aria-invalid={errorsStep3.email ? 'true' : undefined}
                        aria-describedby={errorsStep3.email ? 'adscripcion-email-error' : undefined}
                        className={inputClass}
                        placeholder="tu@email.com"
                      />
                    </Field>

                    <Field
                      label="Contraseña"
                      htmlFor="adscripcion-password"
                      error={errorsStep3.password?.message}
                      required
                    >
                      <div className="relative">
                        <input
                          {...controlStep3.register('password')}
                          id="adscripcion-password"
                          type={showPassword ? 'text' : 'password'}
                          aria-invalid={errorsStep3.password ? 'true' : undefined}
                          aria-describedby={errorsStep3.password ? 'adscripcion-password-error' : undefined}
                          className={`${inputClass} pr-12`}
                          placeholder="Mínimo 6 caracteres"
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

                    <div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          {...controlStep3.register('confirmData')}
                          id="adscripcion-confirmData"
                          type="checkbox"
                          aria-invalid={errorsStep3.confirmData ? 'true' : undefined}
                          aria-describedby={errorsStep3.confirmData ? 'adscripcion-confirmData-error' : undefined}
                          className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-secondary">
                          Confirmo que los datos proporcionados son correctos y acepto los términos del programa.
                        </span>
                      </label>
                      {errorsStep3.confirmData && (
                        <p className="text-accent text-sm mt-1">{errorsStep3.confirmData.message}</p>
                      )}
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="btn-outline flex items-center gap-2"
                      >
                        <ChevronLeft size={18} />
                        Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Check size={18} />
                        )}
                        {isSubmitting ? 'Enviando...' : 'Si, confirmo y envío'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}