'use client'

import type { DocumentBrief } from '@/lib/types'

type DocumentBriefCardProps = {
  brief: DocumentBrief
  onAsk?: (question: string) => void
}

export function DocumentBriefCard({ brief, onAsk }: DocumentBriefCardProps) {
  return (
    <div className="mb-2 overflow-hidden rounded-xl border-2 border-ink bg-zinc-50 shadow-card">
      <div className="border-b-2 border-ink bg-accent px-4 py-2">
        <span className="text-xs font-black uppercase tracking-[0.21em] text-white">
          Document overview
        </span>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="text-sm font-extrabold tracking-tight">
            {brief.filename}
          </p>
          <p className="text-xs text-foreground/60">
            {brief.kind}
            {brief.pageCount !== null ? ` · ${brief.pageCount} pages` : ''}
            {' · '}
            {brief.chunkCount} passages indexed
          </p>
        </div>
        <p className="text-sm leading-6 text-foreground/80">{brief.summary}</p>

        {brief.keyTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {brief.keyTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-ink bg-white px-2.5 py-0.5 text-xs font-semibold"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {brief.suggestedQuestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.21em] text-foreground/50">
              Suggested questions
            </p>
            {brief.suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={!onAsk}
                onClick={() => onAsk?.(question)}
                className="block w-full rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-left text-xs font-semibold transition-transform hover:translate-x-0.5 disabled:cursor-default disabled:opacity-80"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
