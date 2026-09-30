/**
 * Configuracion SEO centralizada.
 *
 * La URL base se lee de VITE_SITE_URL para poder apuntar a staging sin tocar
 * codigo. Si no esta definida se usa el dominio de produccion.
 */

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://fundapineda.org'
).replace(/\/+$/, '')

export const SITE_NAME = 'Fundación Gustavo Pineda'
export const SITE_SHORT_NAME = 'FundaPineda'
export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const TWITTER_HANDLE = ''

export const DEFAULT_DESCRIPTION =
  'Fundación Gustavo Pineda: Programa Auto-gestionado de Atención Integral de Salud (P.A.A.I.S.) en Maracaibo, estado Zulia, Venezuela.'

/** Construye una URL absoluta a partir de una ruta interna. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export interface PageMeta {
  title: string
  description: string
  /** Ruta interna, se convierte en URL absoluta para canonical y og:url. */
  path?: string
  /** 'website' para paginas normales, 'article' para noticias. */
  ogType?: 'website' | 'article'
  /** Datos estructurados adicionales (fechas, autores). */
  article?: {
    publishedTime?: string
    modifiedTime?: string
    author?: string
  }
  /** Poner en false para paginas privadas que no deben indexarse. */
  noindex?: boolean
}

/** Rutas internas de cada pagina, para mantenerlas sincronizadas con App.tsx. */
export const ROUTE_MAP = {
  home: '/',
  about: '/sobre-nosotros',
  services: '/servicios',
  programs: '/programas',
  doctors: '/directorio-medico',
  mentores: '/mentores',
  news: '/noticias',
  contact: '/contactanos',
  signup: '/adscripcion',
  login: '/login',
  notFound: '/404',
} as const

/** Titulos de las paginas publicas, con el nombre del sitio al final. */
export const PAGE_TITLES = {
  home: 'Inicio',
  about: 'Sobre nosotros',
  services: 'Servicios',
  programs: 'Programas',
  doctors: 'Directorio médico',
  mentores: 'Mentores',
  news: 'Noticias',
  newsDetail: 'Noticia',
  contact: 'Contáctanos',
  signup: 'Adscripción al P.A.A.I.S.',
  login: 'Iniciar sesión',
  notFound: 'Página no encontrada',
} as const
