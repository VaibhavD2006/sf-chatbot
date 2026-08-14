'use client'

import { useRef } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSubmit()
  }

  return (
    <div className="border border-[var(--border)] rounded-2xl bg-[var(--surface)] shadow-sm focus-within:border-gray-300 transition-colors">
      <div className="px-4 pt-3 pb-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onSubmit={handleSubmit}
          placeholder="Ask anything from the podcast…"
          disabled={disabled}
          className="min-h-[24px] max-h-[200px]"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-3">
        <p className="text-xs text-[var(--text-muted)]">
          Enter to send · Shift+Enter for newline
        </p>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          size="sm"
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
