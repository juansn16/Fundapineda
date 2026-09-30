import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Users,
  UserCheck,
  Home,
  BarChart3,
  UserRound,
  CalendarDays,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { metricsService, MetricsData } from '../../lib/metricsService'
import { extractErrorMessage } from '../../lib/errorUtils'

const PALETA = ['#1D5BA3', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#0EA5E9']

type ModoSerie = 'diario' | 'semanal' | 'mensual'

const ETIQUETA_MODO: Record<ModoSerie, string> = {
  diario: 'Día',
  semanal: 'Semana',
  mensual: 'Mes',
}

export function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modo, setModo] = useState<ModoSerie>('mensual')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const metrics = await metricsService.getMetrics()
        setData(metrics)
      } catch (err: unknown) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totales = data?.totales
  const serie = data ? data.registros_serie[modo].map(p => ({ label: p.fecha || p.semana || p.mes, count: p.count })) : []
  const usuariosMensual = data ? data.usuarios_mensual.map(p => ({ label: p.mes, count: p.count })) : []
  const nacionalidades = data?.nacionalidades ?? []
  const edades = data?.edades ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Métricas de Registros</h1>
          <p className="text-gray-600 mt-1">
            Indicadores de la población adscrita al sistema P.A.A.I.S.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {totales && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totales.personas_registradas}</p>
            <p className="text-sm text-gray-600 mt-1">Personas registradas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-50 rounded-xl">
                <UserRound className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totales.usuarios}</p>
            <p className="text-sm text-gray-600 mt-1">Usuarios del sistema</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-50 rounded-xl">
                <Home className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totales.familias}</p>
            <p className="text-sm text-gray-600 mt-1">Familias adscritas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {totales.verificados}
              <span className="text-lg font-medium text-gray-400"> / {totales.pendientes}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">Verificados / Pendientes</p>
          </div>
        </div>
      )}

      {/* Registros por fecha */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-xl">
              <CalendarDays className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Registros por {ETIQUETA_MODO[modo].toLowerCase()}</h2>
              <p className="text-sm text-gray-600 mt-1">Evolución del ritmo de adscripción según fecha de firma</p>
            </div>
          </div>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
            {(Object.keys(ETIQUETA_MODO) as ModoSerie[]).map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modo === m ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ETIQUETA_MODO[m]}
              </button>
            ))}
          </div>
        </div>

        {serie.length === 0 ? (
          <p className="text-center py-12 text-gray-500">Sin registros para mostrar</p>
        ) : (
          <div className="h-72" role="img" aria-label={`Cantidad de registros de adscripción agrupados por ${ETIQUETA_MODO[modo].toLowerCase()}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D5BA3" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1D5BA3" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Registros" stroke="#1D5BA3" fill="url(#colorRegistros)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Nacionalidades */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-50 rounded-xl">
            <Users className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nacionalidades</h2>
            <p className="text-sm text-gray-600 mt-1">Distribución de la población adscrita</p>
          </div>
        </div>

        {nacionalidades.length === 0 ? (
          <p className="text-center py-12 text-gray-500">Sin datos de nacionalidad</p>
        ) : (
          <div className="h-72" role="img" aria-label="Cantidad de personas adscritas por nacionalidad">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nacionalidades}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nacionalidad" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Personas" radius={[6, 6, 0, 0]}>
                  {nacionalidades.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Edades y usuarios por mes */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-rose-50 rounded-xl">
              <UserRound className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Rango de Edades</h2>
              <p className="text-sm text-gray-600 mt-1">Según fecha de nacimiento</p>
            </div>
          </div>

          {edades.length === 0 ? (
            <p className="text-center py-12 text-gray-500">Sin datos de edad</p>
          ) : (
            <div className="h-72" role="img" aria-label="Distribución de personas adscritas por rango de edades">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={edades}
                    dataKey="count"
                    nameKey="rango"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {edades.map((_, i) => (
                      <Cell key={i} fill={PALETA[i % PALETA.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Usuarios creados por mes</h2>
              <p className="text-sm text-gray-600 mt-1">Según fecha de registro en el sistema</p>
            </div>
          </div>

          {usuariosMensual.length === 0 ? (
            <p className="text-center py-12 text-gray-500">Sin registros para mostrar</p>
          ) : (
            <div className="h-72" role="img" aria-label="Cantidad de usuarios creados por mes">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usuariosMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Usuarios" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}