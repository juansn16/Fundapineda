import api from './api'

export interface Usuario {
  id: string
  email: string
  password?: string
}

export interface Persona {
  id?: string
  cedula: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  genero: 'M' | 'F'
  nacionalidad: string
  telefono: string
  nombre_familia: string
  ubicacion?: {
    id?: string
    pais: string
    estado: string
    ciudad: string
    direccion: string
  }
}

export interface Adscripcion {
  id?: string
  fecha_firma?: string
  // ip_registro lo calcula el servidor a partir de la IP real de la request.
  ruta_firma?: string
  ruta_documento_final?: string
}

export interface RegistroCompleto {
  persona: Persona
  usuario: Pick<Usuario, 'email' | 'password'>
  adscripcion: Adscripcion
  temp_signature_name: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: {
    email: string
    id: string
  }
}

export interface UsuarioPerfil {
  id: string
  email: string
  is_verified: boolean
  persona?: Persona
  roles: string[]
}

export interface UsuarioCompleto extends Usuario {
  persona?: Persona
  roles?: string[]
  is_verified?: boolean
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    
    const response = await api.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  async register(data: RegistroCompleto): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data)
    return response.data
  },

  async procesarFirma(file: File): Promise<{ temp_file_name: string; preview_base64: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post<{ temp_file_name: string; preview_base64: string }>(
      '/auth/firma',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  },

  getToken(): string | null {
    return localStorage.getItem('access_token')
  },

  getUser(): UsuarioCompleto | null {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  setUser(user: UsuarioCompleto) {
    localStorage.setItem('user', JSON.stringify(user))
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  async getProfile(): Promise<UsuarioPerfil> {
    const response = await api.get<UsuarioPerfil>('/auth/me')
    return response.data
  },

  async downloadAdscripcion(): Promise<Blob> {
    const response = await api.get('/reports/adscripcion', {
      responseType: 'blob',
      params: { t: `${Date.now()}_${Math.random().toString(36).slice(2)}` },
    })
    return response.data
  },

  async refreshToken(): Promise<{ access_token: string; refresh_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post<{
      access_token: string
      refresh_token: string
      token_type: string
    }>('/auth/refresh', null, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    })

    const { access_token, refresh_token } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)

    return response.data
  }
}

export default authService