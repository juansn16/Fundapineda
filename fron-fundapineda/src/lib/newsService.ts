import api from './api'

export interface NoticiaInIndex {
  id: string
  titulo: string
  categoria: string
  fecha: string
  url_imagen: string
  imagen_base64?: string
  imagen_media_type?: string
}

export interface NoticiaResponse {
  id: string
  titulo: string
  categoria: string
  contenido: string
  resumen: string
  fecha: string
  url_imagen: string
  imagen_base64?: string
  imagen_media_type?: string
}

export interface NoticiaFormData {
  titulo: string
  categoria: string
  contenido: string
  resumen: string
  image?: File
}

export const newsService = {
  async listNews(includeImage: boolean = false): Promise<NoticiaInIndex[]> {
    const response = await api.get<NoticiaInIndex[]>('/noticias/', {
      params: { include_image: includeImage }
    })
    return response.data
  },

  async getNews(id: string, includeImage: boolean = false): Promise<NoticiaResponse> {
    const response = await api.get<NoticiaResponse>(`/noticias/${id}${includeImage ? '?include_image=true' : ''}`)
    return response.data
  },

  async createNews(data: NoticiaFormData): Promise<NoticiaResponse> {
    const formData = new FormData()
    formData.append('titulo', data.titulo)
    formData.append('categoria', data.categoria)
    formData.append('contenido', data.contenido)
    formData.append('resumen', data.resumen)
    if (data.image) {
      formData.append('image', data.image)
    }
    
    const response = await api.post<NoticiaResponse>('/noticias/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async updateNews(id: string, data: NoticiaFormData): Promise<NoticiaResponse> {
    const formData = new FormData()
    formData.append('titulo', data.titulo)
    formData.append('categoria', data.categoria)
    formData.append('contenido', data.contenido)
    formData.append('resumen', data.resumen)
    if (data.image) {
      formData.append('image', data.image)
    }
    
    const response = await api.put<NoticiaResponse>(`/noticias/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async deleteNews(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/noticias/${id}`)
    return response.data
  }
}
