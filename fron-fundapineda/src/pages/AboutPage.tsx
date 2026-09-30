import { motion } from 'framer-motion'
import { Target, Eye, Heart, Users } from 'lucide-react'
import { AnimatedCard } from '../components/AnimatedCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const aboutData = {
  historia: `La Fundación Gustavo Pineda nace como respuesta a la creciente necesidad de 
    atención médica accesible en el Estado Zulia. Fundada en respuesta a la crítica situación 
    sanitaria de Venezuela, nuestra institución se ha convertido en un faro de esperanza 
    para miles de familias zulianas que buscan servicios de salud de calidad.`,

  vision: `Ser líderes en la transformación del sistema de salud en Venezuela, 
    establecidos como una Empresa Social de Salud que combine métodos eficientes 
    de gestión con un compromiso genuino con el bienestar de la comunidad, 
    generando un impacto sosial medible y sostenible.`,

  mission: `Promover y preservar la salud de nuestros participantes a través de 
    una atención integral, eficaz y digna, ejecutando programas que prioricen 
    la Atención Comunitaria Primaria sobre la hospitalaria, manteniendo siempre 
    el compromiso con la calidad y la humanización del servicio.`,

  valores: [
    { icon: Heart, title: 'Solidaridad', description: 'Compromiso genuino con el bienestar comunitario', iconColor: 'bg-red-100 text-red-600' },
    { icon: Users, title: 'Trabajo en Equipo', description: 'Todos somos iguales en la búsqueda de la salud', iconColor: 'bg-blue-100 text-blue-600' },
    { icon: Target, title: 'Excelencia', description: 'Estándares altos en cada servicio que ofrecemos', iconColor: 'bg-green-100 text-green-600' },
    { icon: Eye, title: 'Transparencia', description: 'Honestidad y claridad en todas nuestras acciones', iconColor: 'bg-purple-100 text-purple-600' },
  ],
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export function AboutPage() {
  usePageMeta({
    title: PAGE_TITLES.about,
    description: "Conoce la Fundacion Gustavo Pineda, su historia, mision y vision. Trabajamos por la atencion integral de salud en Maracaibo, estado Zulia.",
    path: '/sobre-nosotros',
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
              Sobre Nosotros
            </h1>
            <p className="text-xl text-secondary max-w-3xl mx-auto">
              Conoce la historia y el propósito de la Fundación Gustavo Pineda
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary font-heading mb-6">
                Nuestra Historia
              </h2>
              <p className="text-lg text-secondary leading-relaxed">
                {aboutData.historia}
              </p>
            </div>
            <div className="bg-primary/5 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary font-heading">2000+</span>
                  <p className="text-sm text-secondary mt-2">Familias Inscritas</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary font-heading">10K+</span>
                  <p className="text-sm text-secondary mt-2">Personas Beneficiadas</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary font-heading">50+</span>
                  <p className="text-sm text-secondary mt-2">Profesionales</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary font-heading">15+</span>
                  <p className="text-sm text-secondary mt-2">Años de Experiencia</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary font-semibold text-sm rounded-full mb-4">
                Misión
              </span>
              <p className="text-lg text-secondary leading-relaxed">
                {aboutData.mission}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent font-semibold text-sm rounded-full mb-4">
                Visión
              </span>
              <p className="text-lg text-secondary leading-relaxed">
                {aboutData.vision}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">Nuestros Valores</h2>
            <p className="section-subtitle mx-auto mt-4">
              Los principios que guían cada una de nuestras acciones
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {aboutData.valores.map((valor, index) => (
              <AnimatedCard
                key={index}
                icon={valor.icon}
                title={valor.title}
                description={valor.description}
                iconColor={valor.iconColor}
                delay={index * 0.1}
              />
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
