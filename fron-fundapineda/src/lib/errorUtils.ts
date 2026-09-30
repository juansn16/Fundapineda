export function extractErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { detail?: unknown } }; message?: string }
  const detail = err.response?.data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map(d => {
        const item = d as { msg?: string }
        return item.msg || ''
      })
      .filter(Boolean)
      .join('. ')
  }

  if (detail && typeof detail === 'object' && 'message' in (detail as Record<string, unknown>)) {
    return (detail as { message: string }).message
  }

  const axiosErr = error as { message?: string }
  if (axiosErr.message) return axiosErr.message

  return 'Error inesperado. Intenta de nuevo.'
}
