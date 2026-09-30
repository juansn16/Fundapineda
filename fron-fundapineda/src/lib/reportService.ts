import api from './api'

export interface ReporteFiltros {
  edad_min: number
  edad_max: number
  genero?: 'M' | 'F'
  nacionalidad?: string
  estado_adscripcion: 'FIRMADO' | 'PENDIENTE' | 'TODOS'
  estado_usuario: 'ACTIVO' | 'INACTIVO' | 'TODOS'
  orden_por: 'nombre' | 'apellido' | 'fecha_nacimiento' | 'fecha_firma'
  orden_tipo: 'asc' | 'desc'
  formato: 'xlsx' | 'csv'
}

export interface RegistroReporte {
  nombre: string
  apellido: string
  cedula: string
  fecha_nacimiento: string | null
  edad: number
  genero: string
  nacionalidad: string
  telefono: string
  nombre_familia: string
  email: string
  estado_usuario: string
  estado_adscripcion: string
  fecha_firma: string | null
}

export interface PreviewReporte {
  total: number
  registros: RegistroReporte[]
}

async function extraerDetalleError(data: unknown): Promise<string> {
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (parsed?.detail) {
        return typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)
      }
      return text
    } catch {
      return 'Error de descarga del reporte'
    }
  }
  if (data && typeof data === 'object' && 'detail' in data) {
    return String((data as { detail: unknown }).detail)
  }
  return 'Error inesperado'
}

export class ReporteError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ReporteError'
    this.status = status
  }
}

export async function manejarErrorReporte(error: unknown): Promise<never> {
  const axiosError = error as { response?: { data?: unknown; status?: number } }
  let detail = 'Error al generar el reporte'
  try {
    detail = await extraerDetalleError(axiosError?.response?.data)
  } catch {
    // se queda con el mensaje por defecto
  }
  throw new ReporteError(detail, axiosError?.response?.status)
}

export const reportService = {
  preview: async (filtros: ReporteFiltros, limit = 20): Promise<PreviewReporte> => {
    try {
      const response = await api.post<PreviewReporte>('/reports/preview', filtros, {
        params: { limit },
      })
      return response.data
    } catch (error) {
      return manejarErrorReporte(error)
    }
  },
  export: async (filtros: ReporteFiltros): Promise<Blob> => {
    try {
      const response = await api.post<Blob>('/reports/export', filtros, {
        responseType: 'blob',
      })
      return response.data
    } catch (error) {
      return manejarErrorReporte(error)
    }
  },
  nacionalidades: async (): Promise<string[]> => {
    try {
      const response = await api.get<{ nacionalidades: string[] }>('/reports/nacionalidades')
      return response.data.nacionalidades
    } catch {
      return ['Venezolana']
    }
  },
}