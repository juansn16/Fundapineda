import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6'

const footerLinks = {
  servicios: [
    { path: '/servicios', label: 'Nuestros Servicios' },
    { path: '/directorio-medico', label: 'Directorio Médico' },
    { path: '/contactanos', label: 'Contáctanos' },
  ],
  quickLinks: [
    { path: '/', label: 'Home' },
    { path: '/sobre-nosotros', label: 'Sobre Nosotros' },
    { path: '/servicios', label: 'Servicios' },
    { path: '/adscripcion', label: 'Adscripción' },
  ],
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <img 
                src="/logo.jpeg" 
                alt="Fundación Pineda" 
                className="h-12 w-auto object-contain bg-white rounded-lg p-1"
              />
              <span className="text-xl font-bold font-heading">
                Fundación Pineda
              </span>
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed max-w-md mb-6">
              Comprometidos con la salud integral de las familias zulianas. 
              Brindamos servicios de salud accesibles y de calidad a través 
              del programa P.A.A.I.S.
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin size={18} className="text-primary" />
                <span>Maracaibo, Estado Zulia, Venezuela</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={18} className="text-primary" />
                <a
                  href="tel:+584122368644"
                  className="hover:text-white transition-colors"
                >
                  +58 412-2368644
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={18} className="text-primary" />
                <span>contacto@fundacionpineda.org</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-amber-50 text-lg mb-4">Enlaces</h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-amber-50 text-lg mb-4"> Servicios</h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.servicios.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="mt-6 pt-4 flex flex-col md:flex-row items-end justify-between gap-4">
          {/* Copyright: Alineado a la izquierda (y abajo si es mobile) */}
          <p className="text-gray-400 text-sm order-2 md:order-1">
            © {currentYear} Fundación Gustavo Pineda. Todos los derechos reservados.
          </p>

          {/* Contenedor de Redes: Alineado a la derecha */}
          <div className="flex flex-col items-end gap-3 order-1 md:order-2">
            <h4 className="text-amber-50 text-lg font-medium">Redes Sociales</h4>
            <div className="flex items-center gap-3">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <FaFacebook size={20} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <FaInstagram size={20} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <FaXTwitter size={20} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <FaTiktok size={20} />
              </a>
            </div>
            <p className="text-amber-300/90 text-xs">
              Enlaces de ejemplo — pendientes de publicación.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}