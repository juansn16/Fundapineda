import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Phone, Mail } from 'lucide-react'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const doctors = [
  {
    id: 1,
    nombre: 'Dr. Carlos Mendoza',
    especialidad: 'Medicina General',
    telefono: '+58 412 000-0001',
    email: 'cmendoza@fundacionpineda.org',
    disponibilidad: 'Lunes a Viernes',
  },
  {
    id: 2,
    nombre: 'Dra. María López',
    especialidad: 'Pediatría',
    telefono: '+58 412 000-0002',
    email: 'mlopez@fundacionpineda.org',
    disponibilidad: 'Lunes a Sábado',
  },
  {
    id: 3,
    nombre: 'Dr. José García',
    especialidad: 'Medicina Interna',
    telefono: '+58 412 000-0003',
    email: 'jgarcia@fundacionpineda.org',
    disponibilidad: 'Lunes a Viernes',
  },
  {
    id: 4,
    nombre: 'Dra. Ana Rodríguez',
    especializadas: 'Ginecología',
    telefono: '+58 412 000-0004',
    email: 'arodriguez@fundacionpineda.org',
    disponibilidad: 'Martes a Sábado',
  },
  {
    id: 5,
    nombre: 'Dr. Pedro Fernández',
    especialidad: 'Cardiología',
    telefono: '+58 412 000-0005',
    email: 'pfernandez@fundacionpineda.org',
    disponibilidad: 'Lunes, Miércoles y Viernes',
  },
  {
    id: 6,
    nombre: 'Dra. Laura Martínez',
    especialidades: 'Nutrición',
    telefono: '+58 412 000-0006',
    email: 'lmartinez@fundacionpineda.org',
    disponibilidad: 'Lunes a Viernes',
  },
]

export function DoctorsPage() {
  usePageMeta({
    title: PAGE_TITLES.doctors,
    description: "Directorio del equipo medico de la Fundacion Gustavo Pineda. Especialistas que atienden a los miembros del programa P.A.A.I.S. en Maracaibo, Zulia.",
    path: '/directorio-medico',
  })

  const [searchTerm, setSearchTerm] = useState('')

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.especialidad || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              Directorio Médico
            </h1>
            <p className="text-xl text-secondary max-w-3xl mx-auto">
              Conoce a nuestro equipo de profesionales de la salud 
              comprometidos con tu bienestar.
            </p>
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-xl mx-auto">
              Directorio de ejemplo: los profesionales y datos mostrados son ilustrativos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto mb-12"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 
                        focus:border-primary focus:ring-2 focus:ring-primary/20 
                        outline-none transition-all"
              />
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl 
                         transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-24 bg-gradient-to-br from-primary to-primary/70">
                  <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    Ejemplo
                  </span>
                </div>
                <div className="p-6 -mt-12">
                  <div className="w-24 h-24 bg-white rounded-full shadow-md 
                              flex items-center justify-center mb-4 mx-auto"
                  >
                    <span className="text-3xl font-bold text-primary">
                      {doctor.nombre.split(' ')[1]?.[0] || 'D'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-primary text-center font-heading">
                    {doctor.nombre}
                  </h3>
                  <p className="text-accent text-center font-medium mb-4">
                    {doctor.especialidad}
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-secondary">
                      <Phone size={16} className="flex-shrink-0" />
                      <span>{doctor.telefono}</span>
                    </div>
                    <div className="flex items-center gap-3 text-secondary">
                      <Mail size={16} className="flex-shrink-0" />
                      <span className="truncate">{doctor.email}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">
                    {doctor.disponibilidad}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary text-lg">
                No se encontraron profesionales con ese criterio de búsqueda.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}