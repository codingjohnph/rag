'use client'

import { useState } from 'react'
import type { EvidenceItem } from '@/lib/types'

type EvidenceCardsProps = {
  items: EvidenceItem[]
  flashedCitation?: number | null
}

export function EvidenceCards({ items, flashedCitation }: EvidenceCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="mt-2 space-y-2">
      <p className="px-1 text-xs font-black uppercase tracking-[0.21em] text-accent">
        Evidence ({items.length})
      </p>
      {items.map((item, index) => {
        const number = item.index ?? index + 1
        const id = item.chunkId || String(index)
        const isOpen = openId === id
        const isFlashed = flashedCitation === number

        return (
          <div
            key={id}
            data-citation={number}
            className={`overflow-hidden rounded-xl border-2 border-ink bg-zinc-50 shadow-card transition-shadow ${
              isFlashed ? 'ring-2 ring-accent' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold tracking-tight">
                  [{number}] {item.filename}
                </span>
                <span className="block truncate text-xs text-foreground/60">
                  {item.locator}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-lg leading-none">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className="border-t-2 border-ink px-4 py-3">
                {item.why && (
                  <p className="mb-2 text-xs italic text-foreground/60">
                    {item.why}
                  </p>
                )}
                <blockquote className="text-sm leading-6 text-foreground/80">
                  “{item.excerpt}”
                </blockquote>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
