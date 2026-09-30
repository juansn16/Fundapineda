import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileSpreadsheet, Eye, Download, Loader2, AlertTriangle, Table2 } from 'lucide-react'
import {
  reportService,
  ReporteFiltros,
  PreviewReporte,
  ReporteError,
} from '../../lib/reportService'
import { extractErrorMessage } from '../../lib/errorUtils'
import { Field } from '../../components/Field'

const parseEdad = (valor: unknown): number => {
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

const MAX_EXPORT = 20000

const reporteSchema = z
  .object({
    edad_min: z.number().int().min(0).max(120),
    edad_max: z.number().int().min(0).max(120),
    genero: z.enum(['M', 'F', '']),
    nacionalidad: z.string(),
    estado_adscripcion: z.enum(['FIRMADO', 'PENDIENTE', 'TODOS']),
    estado_usuario: z.enum(['ACTIVO', 'INACTIVO', 'TODOS']),
    orden_por: z.enum(['nombre', 'apellido', 'fecha_nacimiento', 'fecha_firma']),
    orden_tipo: z.enum(['asc', 'desc']),
    formato: z.enum(['xlsx', 'csv']),
  })
  .refine(values => values.edad_min <= values.edad_max, {
    message: 'La edad mínima no puede ser mayor que la máxima',
    path: ['edad_max'],
  })

type ReporteFormValues = z.infer<typeof reporteSchema>

const formatoLabel: Record<string, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
}

export function ReportesPage() {
  const [nacionalidades, setNacionalidades] = useState<string[]>(['Venezolana'])
  const [preview, setPreview] = useState<PreviewReporte | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReporteFormValues>({
    resolver: zodResolver(reporteSchema),
    defaultValues: {
      edad_min: 0,
      edad_max: 120,
      genero: '',
      nacionalidad: 'Venezolana',
      estado_adscripcion: 'TODOS',
      estado_usuario: 'TODOS',
      orden_por: 'fecha_firma',
      orden_tipo: 'asc',
      formato: 'xlsx',
    },
  })

  useEffect(() => {
    reportService.nacionalidades().then(setNacionalidades)
  }, [])

  const buildFiltros = (values: ReporteFormValues): ReporteFiltros => ({
    edad_min: values.edad_min,
    edad_max: values.edad_max,
    genero: values.genero || undefined,
    nacionalidad: values.nacionalidad || undefined,
    estado_adscripcion: values.estado_adscripcion,
    estado_usuario: values.estado_usuario,
    orden_por: values.orden_por,
    orden_tipo: values.orden_tipo,
    formato: values.formato,
  })

  const manejarError = (err: unknown) => {
    const mensaje = err instanceof ReporteError ? err.message : extractErrorMessage(err)
    toast.error(mensaje || 'Error al generar el reporte')
  }

  const handlePreview = async (values: ReporteFormValues) => {
    setPreviewing(true)
    setPreview(null)
    try {
      const data = await reportService.preview(buildFiltros(values), 20)
      setPreview(data)
      if (data.total === 0) {
        toast.error('No se encontraron registros con los filtros seleccionados')
      }
    } catch (err) {
      manejarError(err)
    } finally {
      setPreviewing(false)
    }
  }

  const handleExport = async (values: ReporteFormValues) => {
    setExporting(true)
    try {
      const blob = await reportService.export(buildFiltros(values))
      const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `reporte_fundapineda_${hoy}.${values.formato}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('Reporte descargado correctamente')
    } catch (err) {
      manejarError(err)
    } finally {
      setExporting(false)
    }
  }

  const disabled = previewing || exporting

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-primary font-heading">
          Reportes Dinámicos
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Combina filtros, previsualiza los resultados y exporta la información en
          Excel o CSV.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="font-semibold text-gray-900">Filtros del reporte</h2>
        </div>

        <form onSubmit={handleSubmit(handleExport)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field
              label="Edad mínima"
              htmlFor="reporte-edad-min"
              error={errors.edad_min?.message}
            >
              <input
                {...register('edad_min', { setValueAs: parseEdad })}
                id="reporte-edad-min"
                type="number"
                min={0}
                max={120}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </Field>

            <Field
              label="Edad máxima"
              htmlFor="reporte-edad-max"
              error={errors.edad_max?.message}
            >
              <input
                {...register('edad_max', { setValueAs: parseEdad })}
                id="reporte-edad-max"
                type="number"
                min={0}
                max={120}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </Field>

            <Field label="Género" htmlFor="reporte-genero">
              <select
                {...register('genero')}
                id="reporte-genero"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="">Todos</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </Field>

            <Field label="Nacionalidad" htmlFor="reporte-nacionalidad">
              <select
                {...register('nacionalidad')}
                id="reporte-nacionalidad"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="">Todas</option>
                {nacionalidades.map(nacionalidad => (
                  <option key={nacionalidad} value={nacionalidad}>
                    {nacionalidad}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Estado de adscripción" htmlFor="reporte-adscripcion">
              <select
                {...register('estado_adscripcion')}
                id="reporte-adscripcion"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="FIRMADO">Firmado</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </Field>

            <Field label="Estado de usuario" htmlFor="reporte-usuario">
              <select
                {...register('estado_usuario')}
                id="reporte-usuario"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </Field>

            <Field label="Ordenar por" htmlFor="reporte-orden-por">
              <select
                {...register('orden_por')}
                id="reporte-orden-por"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="fecha_firma">Fecha de firma</option>
                <option value="nombre">Nombre</option>
                <option value="apellido">Apellido</option>
                <option value="fecha_nacimiento">Fecha de nacimiento</option>
              </select>
            </Field>

            <Field label="Tipo de orden" htmlFor="reporte-orden-tipo">
              <select
                {...register('orden_tipo')}
                id="reporte-orden-tipo"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="asc">Ascendente (A-Z)</option>
                <option value="desc">Descendente (Z-A)</option>
              </select>
            </Field>

            <Field label="Formato de exportación" htmlFor="reporte-formato">
              <select
                {...register('formato')}
                id="reporte-formato"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                {(['xlsx', 'csv'] as const).map(f => (
                  <option key={f} value={f}>
                    {formatoLabel[f]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit(values => handlePreview(values))}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Eye size={18} />
              )}
              Previsualizar
            </button>

            <button
              type="submit"
              disabled={disabled}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Generar y Descargar Reporte
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {preview && preview.total > MAX_EXPORT && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm">
            El resultado ({preview.total.toLocaleString()} registros) supera el máximo
            permitido de {MAX_EXPORT.toLocaleString()}. Ajusta los filtros para poder
            descargar el reporte.
          </p>
        </div>
      )}

      {preview && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-6 pb-4">
            <div className="flex items-center gap-2">
              <Table2 size={18} className="text-primary" />
              <h2 className="font-semibold text-gray-900">Vista previa</h2>
            </div>
            <p className="text-sm text-gray-500">
              Mostrando {preview.registros.length} de{' '}
              <span className="font-medium text-gray-700">
                {preview.total.toLocaleString()}
              </span>{' '}
              registro(s)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Apellido</th>
                  <th className="px-6 py-3 font-medium">Cédula</th>
                  <th className="px-6 py-3 font-medium">Edad</th>
                  <th className="px-6 py-3 font-medium">Género</th>
                  <th className="px-6 py-3 font-medium">Nacionalidad</th>
                  <th className="px-6 py-3 font-medium">Estado Usuario</th>
                  <th className="px-6 py-3 font-medium">Estado Adscripción</th>
                  <th className="px-6 py-3 font-medium">Fecha Firma</th>
                </tr>
              </thead>
              <tbody>
                {preview.registros.map((registro, index) => (
                  <tr
                    key={`${registro.cedula}-${index}`}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">{registro.nombre}</td>
                    <td className="px-6 py-3">{registro.apellido}</td>
                    <td className="px-6 py-3">{registro.cedula}</td>
                    <td className="px-6 py-3">{registro.edad}</td>
                    <td className="px-6 py-3">{registro.genero || '-'}</td>
                    <td className="px-6 py-3">{registro.nacionalidad}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          registro.estado_usuario === 'ACTIVO'
                            ? 'bg-green-100 text-green-800'
                            : registro.estado_usuario === 'INACTIVO'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {registro.estado_usuario}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          registro.estado_adscripcion === 'FIRMADO'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {registro.estado_adscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-3">{registro.fecha_firma || '-'}</td>
                  </tr>
                ))}
                {preview.registros.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}