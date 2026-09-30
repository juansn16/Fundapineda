import { motion } from 'framer-motion'
import { UserCircle, BookOpen, Award, Heart } from 'lucide-react'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const mentores = [
  {
    id: 1,
    nombre: 'Dr. Gustavo Pineda',
    foto: '/logo.jpeg',
    especialidad: 'Medicina General',
    mentoria: 'Mentoría en Gestión de Salud Comunitaria',
    aportes: 'Fundador de la Fundación, líder en transformación del sistema de salud en el Zulia.',
  },
  {
    id: 2,
    nombre: 'Dra. Ana Contreras',
    foto: '/logo.jpeg',
    especialidad: 'Pediatría',
    mentoria: 'Mentoría en Atención Pediátrica Integral',
    aportes: 'Desarrollo de programas de salud infantil beneficiando a más de 500 familias.',
  },
  {
    id: 3,
    nombre: 'Dr. Luis Ramírez',
    foto: '/logo.jpeg',
    especialidad: 'Medicina Interna',
    mentoria: 'Mentoría en Medicina Preventiva',
    aportes: 'Implementación de protocolos de atención primaria que redujeron hospitalizaciones en 30%.',
  },
  {
    id: 4,
    nombre: 'Dra. Carmen Silva',
    foto: '/logo.jpeg',
    especialidad: 'Ginecología',
    mentoria: 'Mentoría en Salud Reproductiva',
    aportes: 'Creación de la unidad de salud materna con atención a más de 200 mujeres anualmente.',
  },
  {
    id: 5,
    nombre: 'Dr. Roberto Vargas',
    foto: '/logo.jpeg',
    especialidad: 'Cardiología',
    mentoria: 'Mentoría en Cardiología Comunitaria',
    aportes: 'Programa de prevención cardiovascular con detección temprana en comunidades vulnerables.',
  },
  {
    id: 6,
    nombre: 'Dra. Patricia Mendoza',
    foto: '/logo.jpeg',
    especialidad: 'Nutrición',
    mentoria: 'Mentoría en Nutrición y Bienestar',
    aportes: 'Desarrollo de planes nutricionales personalizados para pacientes crónicos.',
  },
]

export function MentoresPage() {
  usePageMeta({
    title: PAGE_TITLES.mentores,
    description: "Conoce a los mentores que acompanan y orientan a las familias del programa P.A.A.I.S. de la Fundacion Gustavo Pineda.",
    path: '/mentores',
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
              Nuestros Mentores
            </h1>
            <p className="text-xl text-secondary max-w-3xl mx-auto">
              Conoce a los profesionales que guían y transforman vidas
              a través de la mentoría en nuestra fundación.
            </p>
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-xl mx-auto">
              Mentores de ejemplo: los profesionales y datos mostrados son ilustrativos.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mentores.map((mentor, index) => (
              <motion.div
                key={mentor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl 
                         transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-48 bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    Ejemplo
                  </span>
                  <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={mentor.foto}
                      alt={mentor.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-primary text-center font-heading mb-2">
                    {mentor.nombre}
                  </h3>
                  <p className="text-accent text-center font-medium mb-4">
                    {mentor.especialidad}
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <BookOpen size={18} className="flex-shrink-0 text-primary mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-secondary">Mentoría</p>
                        <p className="text-sm text-gray-600">{mentor.mentoria}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Award size={18} className="flex-shrink-0 text-primary mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-secondary">Aportes</p>
                        <p className="text-sm text-gray-600">{mentor.aportes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Heart size={14} className="text-accent" />
                      <span>Mentor destacado</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
