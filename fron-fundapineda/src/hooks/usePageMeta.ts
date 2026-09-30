import { useEffect } from 'react'
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  OG_IMAGE,
  SITE_NAME,
  SITE_SHORT_NAME,
  TWITTER_HANDLE,
  type PageMeta,
} from '../lib/seo'

/**
 * Aplica title, description, canonical y Open Graph por ruta.
 *
 * React Router 7 solo ofrece el componente <Head> en modo framework (data
 * routers con SSR). Este proyecto usa BrowserRouter en modo declarativo, asi
 * que el title vive en el documento y hay que manipularlo a mano.
 *
 * Las etiquetas se crean una vez y despues solo se actualiza su contenido, para
 * no duplicar nodos en cada navegacion.
 */

type TagName = 'title' | 'meta' | 'link'

function upsertTag(name: TagName, attr: string, key: string, content: string) {
  let tag = document.head.querySelector<HTMLTitleElement | HTMLMetaElement | HTMLLinkElement>(
    `${name}[${attr}="${key}"]`
  )
  if (!tag) {
    tag = document.createElement(name)
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  // Los <link> usan href; las <meta> usan content. La etiqueta coincide por
  // name/rel, asi que no se puede inferir el atributo desde el selector.
  tag.setAttribute(name === 'link' ? 'href' : 'content', content)
}

function setProperty(property: string, content: string) {
  upsertTag('meta', 'property', property, content)
}

function setName(name: string, content: string) {
  upsertTag('meta', 'name', name, content)
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  ogType = 'website',
  article,
  noindex = false,
}: PageMeta) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_SHORT_NAME}`
    const url = absoluteUrl(path)

    document.title = fullTitle

    upsertTag('meta', 'name', 'description', description)
    upsertTag('link', 'rel', 'canonical', url)

    setName('robots', noindex ? 'noindex, nofollow' : 'index, follow')

    setProperty('og:type', ogType)
    setProperty('og:site_name', SITE_NAME)
    setProperty('og:title', fullTitle)
    setProperty('og:description', description)
    setProperty('og:url', url)
    setProperty('og:locale', 'es_VE')
    setProperty('og:image', OG_IMAGE)
    setProperty('og:image:width', '1200')
    setProperty('og:image:height', '630')
    setProperty('og:image:alt', `${SITE_NAME} - P.A.A.I.S.`)

    setName('twitter:card', 'summary_large_image')
    setName('twitter:title', fullTitle)
    setName('twitter:description', description)
    setName('twitter:image', OG_IMAGE)
    if (TWITTER_HANDLE) {
      setName('twitter:site', TWITTER_HANDLE)
    }

    if (ogType === 'article') {
      if (article?.publishedTime) {
        setProperty('article:published_time', article.publishedTime)
      }
      if (article?.modifiedTime) {
        setProperty('article:modified_time', article.modifiedTime)
      }
      if (article?.author) {
        setProperty('article:author', article.author)
      }
    }
  }, [title, description, path, ogType, article, noindex])
}
