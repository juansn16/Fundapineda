import api from './api'

export interface RolData {
  id: string
  rol: string
  descripcion?: string | null
}

export interface RolCreateData {
  rol: string
  descripcion?: string | null
}

export interface RolUpdateData {
  rol?: string
  descripcion?: string | null
}

export const rolesService = {
  async list(): Promise<RolData[]> {
    const response = await api.get<RolData[]>('/admin/roles/')
    return response.data
  },

  async create(data: RolCreateData): Promise<RolData> {
    const response = await api.post<RolData>('/admin/roles/', data)
    return response.data
  },

  async update(id: string, data: RolUpdateData): Promise<RolData> {
    const response = await api.put<RolData>(`/admin/roles/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/roles/${id}`)
    return response.data
  }
}
