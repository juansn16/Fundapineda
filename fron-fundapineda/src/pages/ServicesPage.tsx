import { motion } from 'framer-motion'
import { Heart, Shield, Stethoscope, Users, Activity, Calendar, Phone } from 'lucide-react'
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6'
import { AnimatedCard } from '../components/AnimatedCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const services = [
  {
    icon: Heart,
    title: 'Atención Primaria',
    description: 'Atención médica inicial para todas las edades. Medicina preventiva y promoción de hábitos saludables.',
    iconColor: 'bg-red-100 text-red-600',
  },
  {
    icon: Stethoscope,
    title: 'Consultas Especializadas',
    description: 'Acceso a especialistas en diferentes áreas: pediatría, ginecología, medicina interna y más.',
    iconColor: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Shield,
    title: 'Cobertura Hospitalaria',
    description: 'Protección completa ante eventos hospitalarios con tiempos de respuesta garantizados.',
    iconColor: 'bg-green-100 text-green-600',
  },
  {
    icon: Activity,
    title: 'Chequeos Preventivos',
    description: 'Programas de despistaje précoce para detectar y prevenir enfermedades.',
    iconColor: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Users,
    title: 'Salud Familiar',
    description: 'Programas diseñados para el cuidado integral de toda la familia.',
    iconColor: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Calendar,
    title: 'Atención Programada',
    description: 'Citas programadas y atención oportuna sin largas esperas.',
    iconColor: 'bg-teal-100 text-teal-600',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export function ServicesPage() {
  usePageMeta({
    title: PAGE_TITLES.services,
    description: "Servicios de salud del programa P.A.A.I.S.: consultas medicas, odontologia, orientacion y brigadas de salud para tu familia en Maracaibo.",
    path: '/servicios',
  })

  return (
    <div>
      <section className="py-6 md:py-10 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary font-heading mb-6">
              Nuestros Servicios
            </h1>
            <p className="text-xl text-secondary max-w-3xl mx-auto">
              Brindamos una amplia gama de servicios de salud diseñados para 
              cuidar el bienestar de tu familia.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.map((service, index) => (
              <AnimatedCard
                key={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                iconColor={service.iconColor}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-impact text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="container-custom relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl text-amber-50 md:text-4xl font-bold mb-6 font-heading">
              ¿Necesitas más información?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Nuestro equipo está listo para responder todas tus preguntas sobre 
              los servicios del programa P.A.A.I.S.
            </p>
            <a 
              href="/contactanos"
              className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 
                       rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <Phone size={20} />
              Contactar Ahora
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
