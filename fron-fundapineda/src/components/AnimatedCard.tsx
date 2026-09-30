import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface AnimatedCardProps {
  icon?: LucideIcon
  title: string
  description: string
  subtitle?: string
  delay?: number
  iconColor?: string
  className?: string
  children?: React.ReactNode
}

export function AnimatedCard({
  icon: Icon,
  title,
  description,
  subtitle,
  delay = 0,
  iconColor = 'bg-primary/10 text-primary',
  className = '',
  children,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`bg-white p-6 rounded-xl shadow-md hover:shadow-xl 
                  transition-colors duration-300 card-glow ${className}`}
    >
      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm font-medium text-primary mb-2">{subtitle}</p>
      )}
      <p className="text-secondary text-sm leading-relaxed">{description}</p>
      {children}
    </motion.div>
  )
}
