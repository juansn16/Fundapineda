import type { ReactNode } from 'react'

/**
 * Envuelve un campo de formulario con su label vinculado (htmlFor/id),
 * mensaje de error accesible (aria-describedby) y estado aria-invalid.
 *
 * El control va como children; el llamador debe colocarle id={htmlFor} y,
 * opcionalmente, aria-invalid={!!error} y aria-describedby={htmlFor + '-error'}
 * (o usar `errorId`/`describedBy` para generarlos). Si el control lo acepta
 * (react-hook-form no lo pisa), lo más cómodo es:
 *   <Field ...><input {...register('x')} id="x" /></Field>
 */

const errorIdFor = (htmlFor: string) => `${htmlFor}-error`
const hintIdFor = (htmlFor: string) => `${htmlFor}-hint`

export function describedBy(htmlFor: string, error?: string, hint?: string): string | undefined {
  const ids = [error ? errorIdFor(htmlFor) : '', hint ? hintIdFor(htmlFor) : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

interface FieldProps {
  label: string
  /** id del control al que apunta el htmlFor (unico en la pagina). */
  htmlFor: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  labelClassName?: string
  errorClassName?: string
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  labelClassName = 'block text-sm font-medium text-secondary mb-2',
  errorClassName = 'mt-1 text-sm text-red-600',
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClassName}>
        {label}
        {required && (
          <span className="text-red-600 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintIdFor(htmlFor)} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorIdFor(htmlFor)} className={errorClassName}>
          {error}
        </p>
      )}
    </div>
  )
}