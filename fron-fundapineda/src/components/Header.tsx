import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, UserPlus, User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  {
    label: 'Sobre Nosotros',
    submenu: [
      { path: '/sobre-nosotros', label: 'Sobre Nosotros' },
      { path: '/mentores', label: 'Mentores' },
      { path: '/noticias', label: 'Noticias' },
    ],
  },
  {
    label: 'Servicios y Programas',
    submenu: [
      { path: '/servicios', label: 'Servicios' },
      { path: '/programas', label: 'Programas' },
    ],
  },
  { path: '/directorio-medico', label: 'Directorio Médico' },
  { path: '/contactanos', label: 'Contáctanos' },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleMobileDropdown = (label: string) => {
    setOpenMobileDropdowns(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const handleMobileClick = (path: string) => {
    navigate(path)
    setIsOpen(false)
    setOpenMobileDropdowns({})
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass glass-scrolled' : 'bg-white/95 backdrop-blur-sm border-b border-gray-100'
    }`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo.jpeg" 
              alt="Fundación Pineda" 
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="hidden sm:block text-lg font-bold text-primary font-heading">
              Fundación Pineda
            </span>
          </Link>

           <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              if (item.submenu) {
                return (
                  <div key={item.label} className="group relative">
                    <button
                      className={`flex items-center gap-1 text-sm font-medium transition-colors duration-200 hover:text-primary ${
                        item.submenu.some(s => location.pathname === s.path)
                          ? 'text-primary'
                          : 'text-secondary'
                      }`}
                    >
                      {item.label}
                      <ChevronDown size={16} className="transition-transform group-hover:rotate-180" />
                    </button>
                    <div className="absolute left-0 top-full hidden group-hover:block pt-2 z-50">
                      <div className="bg-primary rounded-md shadow-lg py-2 min-w-[180px]">
                        {item.submenu.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`block px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors ${
                              location.pathname === sub.path ? 'bg-white/10' : ''
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <Link
                  key={item.path}
                  to={item.path!}
                  className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                    location.pathname === item.path ? 'text-primary' : 'text-secondary'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-4 ml-8">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary"
                >
                  <User size={18} />
                  <span>{user?.email}</span>
                </Link>
<button
              onClick={handleLogout}
              className="p-2 text-secondary hover:text-accent transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3 ml-8">
                <Link
                  to="/login"
                  className="btn-outline flex items-center gap-2 text-sm py-6"
                >
                  <User size={18} />
                  Iniciar <div>Sesión</div>
                </Link>
                <Link to="/adscripcion" className="btn-primary flex items-center gap-2">
                  <UserPlus size={18} />
                  Adscripción
                </Link>
              </div>
            )}
            <button
              className="md:hidden p-2 text-secondary hover:text-primary"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
             <nav className="container-custom py-4 flex flex-col gap-2">
               {navItems.map((item) => {
                 if (item.submenu) {
                   return (
                     <div key={item.label}>
                       <button
                         onClick={() => toggleMobileDropdown(item.label)}
                         className={`w-full flex items-center justify-between py-2 text-base font-medium transition-colors ${
                           item.submenu.some(s => location.pathname === s.path)
                             ? 'text-primary'
                             : 'text-secondary'
                         }`}
                       >
                         {item.label}
                         <ChevronDown
                           size={16}
                           className={`transition-transform ${openMobileDropdowns[item.label] ? 'rotate-180' : ''}`}
                         />
                       </button>
                       {openMobileDropdowns[item.label] && (
                         <div className="pl-4 flex flex-col gap-2 mt-1">
                           {item.submenu.map((sub) => (
                             <button
                               key={sub.path}
                               onClick={() => handleMobileClick(sub.path)}
                               className={`text-left py-1 text-sm transition-colors ${
                                 location.pathname === sub.path ? 'text-primary font-medium' : 'text-secondary'
                               }`}
                             >
                               {sub.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   )
                 }
                 return (
                   <button
                     key={item.path}
                     onClick={() => handleMobileClick(item.path!)}
                     className={`text-left py-2 text-base font-medium transition-colors ${
                       location.pathname === item.path ? 'text-primary' : 'text-secondary'
                     }`}
                   >
                     {item.label}
                   </button>
                 )
               })}
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => handleMobileClick('/dashboard')}
                    className="text-left py-2 text-base font-medium text-primary"
                  >
                    Mi Panel
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); setOpenMobileDropdowns({}); handleLogout() }}
                    className="text-left py-2 text-base font-medium text-accent"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleMobileClick('/login')}
                    className="text-left py-2 text-base font-medium flex items-center gap-2 text-secondary"
                  >
                    <User size={18} />
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => handleMobileClick('/adscripcion')}
                    className="btn-primary text-center mt-2"
                  >
                    Adscripción
                  </button>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}