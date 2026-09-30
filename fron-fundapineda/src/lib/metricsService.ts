import api from './api'

export interface ConteoEtiqueta {
  [clave: string]: string | number
}

export interface SeriePunto {
  [clave: string]: string | number
}

export interface MetricsTotales {
  personas_registradas: number
  usuarios: number
  adscripciones: number
  familias: number
  verificados: number
  pendientes: number
  activos: number
}

export interface MetricsData {
  totales: MetricsTotales
  nacionalidades: ConteoEtiqueta[]
  edades: ConteoEtiqueta[]
  registros_serie: {
    diario: SeriePunto[]
    semanal: SeriePunto[]
    mensual: SeriePunto[]
  }
  usuarios_mensual: SeriePunto[]
}

export const metricsService = {
  async getMetrics(): Promise<MetricsData> {
    const response = await api.get<MetricsData>('/admin/metrics')
    return response.data
  },
}