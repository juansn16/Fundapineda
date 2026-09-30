import api from './api'

export interface ContactMessage {
  nombre: string
  email: string
  telefono?: string
  mensaje: string
}

export interface ContactMessageItem extends ContactMessage {
  id: string
  fecha: string
  leido: boolean
}

export interface ContactMessageList {
  mensajes: ContactMessageItem[]
  total: number
}

export const contactService = {
  send: async (data: ContactMessage) => {
    const response = await api.post('/contacto/', data)
    return response.data
  },
  list: async (): Promise<ContactMessageList> => {
    const response = await api.get('/admin/contact')
    return response.data
  },
  markRead: async (id: string) => {
    const response = await api.patch(`/admin/contact/${id}/read`)
    return response.data
  },
  remove: async (id: string) => {
    const response = await api.delete(`/admin/contact/${id}`)
    return response.data
  },
}
