'use client'

import { useEffect } from 'react'
import type { EvidenceItem } from '@/lib/types'

type EvidenceModalProps = {
  label: string
  evidence: EvidenceItem
  onClose: () => void
}

export function EvidenceModal({
  label,
  evidence,
  onClose
}: EvidenceModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence ${label}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border-2 border-ink bg-white shadow-card"
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-accent px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-white">
              [{label}] {evidence.filename}
            </p>
            <p className="truncate text-xs text-white/80">{evidence.locator}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence"
            className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-sm font-extrabold shadow-card"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {evidence.why && (
            <p className="text-sm italic leading-6 text-foreground/60">
              {evidence.why}
            </p>
          )}
          <blockquote className="whitespace-pre-wrap border-l-4 border-accent pl-3 text-sm leading-6 text-foreground/80">
            {evidence.excerpt}
          </blockquote>
        </div>
      </div>
    </div>
  )
}
