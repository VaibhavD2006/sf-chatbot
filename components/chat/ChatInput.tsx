'use client'

import { useRef } from 'react'
import { Textarea } from '@/components/ui/Textarea'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22,2 15,22 11,13 2,9"/>
    </svg>
  )
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSubmit()
  }

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--bg)] focus-within:border-gray-400 transition-colors duration-150">
      <div className="px-4 pt-3 pb-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onSubmit={handleSubmit}
          placeholder="Ask anything from the podcast…"
          disabled={disabled}
          className="min-h-[24px] max-h-[200px] text-sm"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-3">
        <p className="text-xs text-[var(--text-muted)]">
          Enter to send · Shift+Enter for newline
        </p>
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="w-7 h-7 rounded-md bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150 cursor-pointer"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
