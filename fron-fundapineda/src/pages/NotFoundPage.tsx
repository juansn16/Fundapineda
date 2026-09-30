import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, ArrowLeft } from 'lucide-react'
import { usePageMeta } from '../hooks/usePageMeta'
import { PAGE_TITLES } from '../lib/seo'

const SUGERENCIAS = [
  { to: '/adscripcion', label: 'Adscripción al P.A.A.I.S.' },
  { to: '/servicios', label: 'Servicios de salud' },
  { to: '/noticias', label: 'Noticias' },
  { to: '/contactanos', label: 'Contáctanos' },
]

export function NotFoundPage() {
  usePageMeta({
    title: PAGE_TITLES.notFound,
    description: 'La página que buscas no existe o cambió de dirección.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg text-center"
      >
        <p className="text-7xl font-bold text-primary/20 font-heading leading-none mb-4">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading mb-4">
          No encontramos esta página
        </h1>
        <p className="text-gray-600 mb-8">
          Es posible que el enlace esté equivocado o que la página haya cambiado de
          dirección. Estas son algunas opciones:
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            <Home size={18} />
            Ir al inicio
          </Link>
          <Link
            to="/noticias"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Search size={18} />
            Ver noticias
          </Link>
        </div>

        <div className="text-left max-w-sm mx-auto">
          <p className="text-sm font-medium text-gray-500 mb-2">También puedes ir a:</p>
          <ul className="space-y-1">
            {SUGERENCIAS.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ArrowLeft size={14} />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  )
}
