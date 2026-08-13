'use client'

import { clsx } from 'clsx'
import { TextareaHTMLAttributes, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSubmit?: () => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ onSubmit, className, onChange, value, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(ref, () => innerRef.current!)

    // Auto-resize on value change
    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSubmit?.()
      }
      props.onKeyDown?.(e)
    }

    return (
      <textarea
        ref={innerRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        rows={1}
        className={clsx(
          'w-full resize-none bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm leading-relaxed',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
