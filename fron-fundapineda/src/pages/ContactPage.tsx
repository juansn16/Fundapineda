import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Send, Clock, CheckCircle, AlertCircle, Loader2, type LucideIcon } from 'lucide-react'
import { contactService } from '../lib/contactService'
import { extractErrorMessage } from '../lib/errorUtils'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'
import { Field } from '../components/Field'

interface ContactInfoItem {
  icon: LucideIcon
  title: string
  content: string
  href?: string
  external?: boolean
}

const contactSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  telefono: z.string().optional(),
  mensaje: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

type ContactFormData = z.infer<typeof contactSchema>

const contactInfo: ContactInfoItem[] = [
  {
    icon: MapPin,
    title: 'Dirección',
    content: 'Maracaibo, Estado Zulia, Venezuela',
    href: 'https://maps.app.goo.gl/kuQnU5jbs8C7YQwo8',
    external: true,
  },
  {
    icon: Phone,
    title: 'Teléfono',
    content: '+58 412-2368644',
    href: 'tel:+584122368644',
  },
  {
    icon: Mail,
    title: 'Email',
    content: 'contacto@fundacionpineda.org',
    href: 'mailto:contacto@fundacionpineda.org',
  },
  {
    icon: Clock,
    title: 'Horario',
    content: 'Lunes a Viernes: 8:00 AM - 5:00 PM',
  },
]

export function ContactPage() {
  usePageMeta({
    title: PAGE_TITLES.contact,
    description: "Contacta a la Fundacion Gustavo Pineda: telefono, correo, direccion y formulario de contacto para el programa P.A.A.I.S. en Maracaibo, Zulia.",
    path: '/contactanos',
  })

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setStatus('idle')
    setErrorMessage('')
    try {
      await contactService.send(data)
      setStatus('success')
      reset()
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err))
      setStatus('error')
    }
  }

  return (
    <div>
      <section className="py-6 md:py-10">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary font-heading mb-6">
              Contáctanos
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Estamos aquí para responder tus preguntas y ayudarte 
              a formar parte del programa P.A.A.I.S.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-primary font-heading mb-6">
                  Envíanos un mensaje
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {status === 'success' && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                      <CheckCircle className="w-5 h-5 text-green-600 " />
                      <p className="text-green-700 text-sm">
                        Mensaje enviado correctamente. Te contactaremos pronto.
                      </p>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                      <AlertCircle className="w-5 h-5 text-red-600 " />
                      <p className="text-red-700 text-sm">
                        {errorMessage || 'Error al enviar el mensaje. Inténtalo de nuevo más tarde.'}
                      </p>
                    </div>
                  )}
                  <Field
                    label="Nombre completo"
                    htmlFor="contacto-nombre"
                    error={errors.nombre?.message}
                    required
                  >
                    <input
                      {...register('nombre')}
                      id="contacto-nombre"
                      type="text"
                      aria-invalid={errors.nombre ? 'true' : undefined}
                      aria-describedby={errors.nombre ? 'contacto-nombre-error' : undefined}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             outline-none transition-all"
                      placeholder="Tu nombre"
                    />
                  </Field>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Field
                      label="Email"
                      htmlFor="contacto-email"
                      error={errors.email?.message}
                      required
                    >
                      <input
                        {...register('email')}
                        id="contacto-email"
                        type="email"
                        aria-invalid={errors.email ? 'true' : undefined}
                        aria-describedby={errors.email ? 'contacto-email-error' : undefined}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 
                               focus:border-primary focus:ring-2 focus:ring-primary/20 
                               outline-none transition-all"
                        placeholder="tu@email.com"
                      />
                    </Field>
                    <Field label="Teléfono" htmlFor="contacto-telefono">
                      <input
                        {...register('telefono')}
                        id="contacto-telefono"
                        type="tel"
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 
                               focus:border-primary focus:ring-2 focus:ring-primary/20 
                               outline-none transition-all"
                        placeholder="+58 412 236-8644"
                      />
                    </Field>
                  </div>

                  <Field
                    label="Mensaje"
                    htmlFor="contacto-mensaje"
                    error={errors.mensaje?.message}
                    required
                  >
                    <textarea
                      {...register('mensaje')}
                      id="contacto-mensaje"
                      rows={5}
                      aria-invalid={errors.mensaje ? 'true' : undefined}
                      aria-describedby={errors.mensaje ? 'contacto-mensaje-error' : undefined}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             outline-none transition-all resize-none"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      <>
                        <Send size={18} />
                        Enviar Mensaje
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="bg-primary rounded-2xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold font-heading mb-6 text-white">
                  Información de contacto
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-4 ">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center 
                                  justify-center "
                      >
                        <info.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-white">{info.title}</h3>
                        {info.href ? (
                          <a
                            href={info.href}
                            {...(info.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="text-white/80 text-sm hover:text-amber-300 transition-colors underline underline-offset-2"
                          >
                            {info.content}
                          </a>
                        ) : (
                          <p className="text-white/80 text-sm">{info.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-primary font-heading mb-4">
                  Ubicación
                </h2>
                <div className="rounded-xl overflow-hidden h-64">
                   <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d210.6187057046087!2d-71.62495840317172!3d10.691240821111945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1ses!2sve!4v1790755302830!5m2!1ses!2sve"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Ubicación Fundación Pineda"
                  />
                </div>
                <a
                  href="https://maps.app.goo.gl/kuQnU5jbs8C7YQwo8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                >
                  <MapPin size={18} />
                  Ver ubicación en Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}