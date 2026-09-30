import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Shield, Users, Search, HeartPulse, Download, ArrowRight } from 'lucide-react'
import { AnimatedCard } from '../components/AnimatedCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const features = [
  {
    icon: Heart,
    title: 'Atención Integral',
    description: 'Guía completa para el cuidado de la salud de toda tu familia.',
    iconColor: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    title: 'Enfoque Familiar',
    description: 'Dirigido a familias enteras, desde niños hasta adultos mayores.',
    iconColor: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'Prevención y Cuidado',
    description: 'Estrategias probadas para mantener una vida saludable.',
    iconColor: 'bg-primary/10 text-primary',
  },
]

const objectives = [
  {
    icon: HeartPulse,
    title: 'Atención Integral',
    description: 'Brindar servicios de salud biopsicosociales y espirituales de calidad.',
    iconColor: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Shield,
    title: 'Prevención y Educación',
    description: 'Fomentar la autorresponsabilidad y el autocuidado mediante la educación sanitaria.',
    iconColor: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Heart,
    title: 'Mejor Calidad de Vida',
    description: 'Incrementar la longevidad, la felicidad y el bienestar a través de una atención primaria robusta.',
    iconColor: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Search,
    title: 'Detección Temprana',
    description: 'Realizar tamizajes constantes para identificar riesgos de salud antes de que se conviertan en problemas graves.',
    iconColor: 'bg-blue-100 text-blue-600',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export function HomePage() {
  usePageMeta({
    title: PAGE_TITLES.home,
    description:
      'Atención integral de salud para tu familia en Maracaibo, Zulia. Adscripción gratuita al programa P.A.A.I.S., directorio médico, noticias y orientación en salud.',
    path: '/',
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-white to-accent/5" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container-custom relative py-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="py-0"
            >
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary font-semibold text-sm rounded-full mb-6">
                Nuevo Programa de Salud
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary font-heading leading-tight mb-6">
                Libro de Procedimientos Médicos
              </h1>
              <p className="text-xl md:text-2xl text-secondary leading-relaxed mb-8">
                Guía integral para la salud de tu familia. 
                Descubre todo lo que necesitas saber sobre el 
                programa P.A.A.I.S. de la Fundación Gustavo Pineda.
              </p>
              <a
                href="/Programa_PAAIS.pdf"
                download
                className="btn-gradient inline-flex items-center justify-center gap-2 animate-glow-pulse"
              >
                <Download size={20} />
                Descargar Libro de Procedimientos
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl blur-2xl" />
                <motion.img
                  src="/portada-libro.jpeg"
                  alt="Libro de Procedimientos Médicos"
                  className="relative w-full h-auto rounded-2xl shadow-2xl"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="section-title">
              ¿Por qué este libro?
            </h2>
            <p className="section-subtitle mx-auto mt-4">
              Una guía práctica diseñada para ayudarte a cuidar la salud 
              de tu familia con el respaldo del programa P.A.A.I.S.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <AnimatedCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  iconColor={feature.iconColor}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Qué es el P.A.A.I.S. */}
      <section className="py-20 md:py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="container-custom relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent font-semibold text-sm rounded-full mb-6">
                Programa P.A.A.I.S.
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-primary font-heading mb-6">
                ¿Qué es el P.A.A.I.S.?
              </h2>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                Es el Proyecto Autogestionado de Atención Integral de Salud, un sistema 
                diseñado para brindar atención digna, eficiente y sostenible. Su enfoque 
                es holístico, integrando la salud física, mental y espiritual de cada 
                persona y su familia.
              </p>

              <h3 className="text-xl font-bold text-primary font-heading mb-4">
                Objetivos Principales
                <span className="block text-sm font-normal text-secondary font-body">Promesa de Valor</span>
              </h3>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-4 mb-8"
              >
                {objectives.map((obj, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <div className="flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors duration-300">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${obj.iconColor}`}>
                        <obj.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{obj.title}</p>
                        <p className="text-sm text-secondary">{obj.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <a
                href="/Programa_PAAIS.pdf"
                download
                className="btn-gradient inline-flex items-center gap-2"
              >
                <Download size={18} />
                Descargar Libro Completo
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative w-full max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl blur-2xl" />
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <iframe
                    src="https://drive.google.com/file/d/1WsRcI1B6xF69aYQazuUHT5S16uJzm-8e/preview"
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Video P.A.A.I.S."
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-impact">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="container-custom relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-heading">
              Únete al programa P.A.A.I.S.
            </h2>
            <p className="text-xl text-white/80 mb-4 max-w-2xl mx-auto">
              Descubre una nueva forma de cuidar la salud de tu núcleo familiar.
            </p>
            <p className="text-white/60 mb-10 max-w-xl mx-auto text-sm">
              Accede a atención integral, prevención y acompañamiento 
              para toda tu familia con un modelo sostenible y humano.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/adscripcion"
                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 
                         rounded-lg font-semibold transition-all duration-300 
                         hover:scale-[1.02] hover:shadow-lg hover:shadow-white/25"
              >
                Inscribirse Ahora
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/contactanos"
                className="inline-flex items-center gap-2 border-2 border-white text-white 
                         px-8 py-4 rounded-lg font-semibold transition-all duration-300 
                         hover:bg-white hover:text-primary"
              >
                Contactar
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
