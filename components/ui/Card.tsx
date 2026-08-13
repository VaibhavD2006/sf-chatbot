import { clsx } from 'clsx'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'none'
}

export function Card({ padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[var(--surface)] border border-[var(--border)] rounded-xl',
        {
          'p-3': padding === 'sm',
          'p-4': padding === 'md',
          '': padding === 'none',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
