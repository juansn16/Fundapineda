import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string
  children: ReactNode
}

export function IconButton({ label, type = 'button', className, children, ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={className} {...rest}>
      {children}
    </button>
  )
}