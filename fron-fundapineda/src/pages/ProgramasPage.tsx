import { motion } from 'framer-motion'
import { Heart, Baby, BookOpen, Users, User, Activity, Shield, HeartPulse, Brain, Stethoscope, Syringe, Phone, Search, Pill } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatedCard } from '../components/AnimatedCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

interface SectionItem {
  icon: LucideIcon
  title: string
  subtitle?: string
  description: string
}

interface ProgramSection {
  title: string
  subtitle?: string
  description?: string
  icon: LucideIcon
  color: string
  items: SectionItem[]
}

const programSections: ProgramSection[] = [
  {
    title: 'Atención por Ciclo Vital',
    subtitle: 'Planes Preventivos',
    description: 'El programa organiza la atención según grupos etarios específicos para garantizar una cobertura adaptada a cada etapa de la vida:',
    icon: Heart,
    color: 'bg-red-100 text-red-600',
    items: [
      { icon: Baby, title: 'Lactantes y Preescolares', subtitle: 'Menores de 4 años', description: 'Enfocado en el seguimiento del crecimiento y desarrollo, así como en el cumplimiento del esquema nacional de inmunizaciones.' },
      { icon: BookOpen, title: 'Escolares', subtitle: '5-9 años', description: 'Incluye evaluaciones médicas periódicas al inicio de cada año escolar para medir peso, talla, agudeza visual y auditiva, salud bucal y estado nutricional.' },
      { icon: Users, title: 'Adolescentes', subtitle: '10-19 años', description: 'Prioriza la educación en salud sexual y reproductiva, prevención de adicciones y atención a la salud mental.' },
      { icon: User, title: 'Adultos', subtitle: '20-59 años', description: 'Centrado en la detección temprana de enfermedades no transmisibles y el fomento de estilos de vida saludables.' },
      { icon: HeartPulse, title: 'Adultos Mayores', subtitle: '60+ años', description: 'Plan preventivo especializado para el manejo de la fragilidad, enfermedades crónicas y promoción de una longevidad activa.' },
    ],
  },
  {
    title: 'Salud Familiar',
    icon: Shield,
    color: 'bg-green-100 text-green-600',
    items: [
      { icon: Baby, title: 'Atención Materno-Neonatal', description: 'Programa para garantizar el control prenatal adecuado, la atención del parto por personal calificado y el seguimiento del recién nacido para reducir la mortalidad materna e infantil.' },
      { icon: Users, title: 'Planificación Familiar', description: 'Orientado a promover la salud sexual, prevenir enfermedades de transmisión sexual y garantizar el acceso a métodos anticonceptivos y educación reproductiva.' },
    ],
  },
  {
    title: 'Salud Mental y Emocional',
    description: 'Este componente busca garantizar el derecho a la salud mental mediante:',
    icon: Brain,
    color: 'bg-purple-100 text-purple-600',
    items: [
      { icon: Pill, title: 'Prevención de Adicciones', description: 'Identificación de riesgos y atención para consumidores de alcohol, psicofármacos y otras sustancias.' },
      { icon: Activity, title: 'Manejo de Crisis y Suicidio', description: 'Detección precoz del riesgo suicida y comportamientos asociados en consultas de primer nivel, escuelas y comunidades.' },
      { icon: Users, title: 'Apoyo Psicosocial', description: 'Atención a personas en hogares disfuncionales o situaciones de abandono, promoviendo la "cultura del amor y la solidaridad humana".' },
      { icon: Search, title: 'Investigación y Vigilancia', description: 'Desarrollo de un sistema de información para la vigilancia epidemiológica de enfermedades mentales y factores protectores.' },
    ],
  },
  {
    title: 'Control de Enfermedades',
    description: 'El programa implementa planes de prevención y control para patologías de alto impacto:',
    icon: Stethoscope,
    color: 'bg-blue-100 text-blue-600',
    items: [
      { icon: HeartPulse, title: 'Enfermedades Crónicas', description: 'Manejo integral de hipertensión arterial (HTA), diabetes, enfermedades respiratorias crónicas (EPOC, asma), insuficiencia renal y enfermedades cardiovasculares.' },
      { icon: Search, title: 'Enfermedades Neoplásicas', description: 'Tamizaje y diagnóstico precoz de cáncer de mama, cuello cérvico-uterino y próstata.' },
      { icon: Syringe, title: 'Enfermedades Infectocontagiosas', description: 'Control de infecciones respiratorias agudas, tuberculosis, VIH/SIDA, enfermedades tropicales (dengue, malaria, chagas) y zoonosis (rabia, leptospirosis).' },
      { icon: Shield, title: 'Prevención de la Sepsis', description: 'Plan específico para el diagnóstico y manejo precoz de la sepsis en el nivel primario.' },
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

export function ProgramsPage() {
  usePageMeta({
    title: PAGE_TITLES.programs,
    description:
      "Programas de salud de la Fundacion Gustavo Pineda: adscripcion, prevencion, educacion y seguimiento medico integral para familias en Maracaibo.",
    path: '/programas',
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative py-16 md:py-20 overflow-hidden bg-gradient-impact text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-5 left-1/3 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-5 right-1/4 w-80 h-80 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="container-custom relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold font-heading mb-6 text-white">
              Nuestros Programas
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              El Programa Auto-gestionado de Atención Integral de Salud (P.A.A.I.S.)
              ofrece una cobertura completa organizada en cuatro grandes áreas para
              garantizar el bienestar de toda la familia.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Program Sections */}
      {programSections.map((section, sectionIndex) => (
        <section
          key={section.title}
          className={`py-16 md:py-20 ${sectionIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        >
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${section.color}`}>
                  <section.icon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-primary font-heading">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="text-lg text-secondary font-medium">{section.subtitle}</p>
                  )}
                </div>
              </div>
              {section.description && (
                <p className="text-lg text-secondary max-w-3xl ml-[72px]">
                  {section.description}
                </p>
              )}
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {section.items.map((item, itemIndex) => (
                <AnimatedCard
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  subtitle={item.subtitle}
                  iconColor={section.color}
                  delay={itemIndex * 0.05}
                />
              ))}
            </motion.div>
          </div>
        </section>
      ))}

      {/* CTA */}
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading text-white">
              ¿Necesitas más información?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Nuestro equipo está listo para responder todas tus preguntas sobre
              los programas de salud disponibles.
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
