import api from './api'
import { UsuarioPerfil, Persona } from './auth'

export interface UpdateProfileData {
  email?: string
  telefono?: string
  direccion?: {
    pais: string
    estado: string
    ciudad: string
    direccion: string
  }
}

export interface VerifyCodeData {
  code: string
}

export interface ApiResponse {
  status: string
  message: string
  campos_actualizados?: string[]
}

export interface UsuarioAdmin {
  id: string
  email: string
  is_verified: boolean
  persona: Persona
  roles: string[]
}

export interface UsuariosListResponse {
  usuarios: UsuarioAdmin[]
  total: number
  page: number
  limit: number
}

export interface UpdateUserRolesData {
  roles: string[]
}

export const userService = {
  async getProfile(): Promise<UsuarioPerfil> {
    const response = await api.get<UsuarioPerfil>('/user/profile')
    return response.data
  },

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse> {
    const response = await api.patch<ApiResponse>('/user/profile', data)
    return response.data
  },

  async requestVerificationCode(): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/user/request-verification-code')
    return response.data
  },

  async verifyCode(data: VerifyCodeData): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/user/verify-code', data)
    return response.data
  },

  // Admin functions
  async listAllUsers(params?: {
    search?: string
    role?: string
    is_verified?: boolean
    page?: number
    limit?: number
  }): Promise<UsuariosListResponse> {
    const response = await api.get<UsuariosListResponse>('/admin/users', { params })
    return response.data
  },

  async getUserById(id: string): Promise<UsuarioAdmin> {
    const response = await api.get<UsuarioAdmin>(`/admin/users/${id}`)
    return response.data
  },

  async updateUserRoles(id: string, data: UpdateUserRolesData): Promise<ApiResponse> {
    const response = await api.patch<ApiResponse>(`/admin/users/${id}/roles`, data)
    return response.data
  },

  async verifyUser(id: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(`/admin/users/${id}/verify`)
    return response.data
  },

  async deleteUser(id: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/admin/users/${id}`)
    return response.data
  }
}
