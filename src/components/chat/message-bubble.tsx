'use client'

import { useState } from 'react'
import type { TextUIPart, UIMessage } from 'ai'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { DocumentBrief, EvidenceItem } from '@/lib/types'
import { DocumentBriefCard } from './document-brief-card'
import { EvidenceModal } from './evidence-modal'

type MessageBubbleProps = {
  message: UIMessage
  onAsk?: (question: string) => void
  isTyping?: boolean
}

const CITATION_PATTERN = /\[([A-Z]?\d+)\]/g

function toCitationMarkdown(text: string): string {
  return text.replace(CITATION_PATTERN, '[$1](#citation-$1)')
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function getEvidence(message: UIMessage): EvidenceItem[] {
  const items: EvidenceItem[] = []

  for (const part of message.parts) {
    const tool = part as {
      type?: string
      state?: string
      output?: { items?: EvidenceItem[] } | null
    }
    if (
      tool.type !== 'tool-presentEvidence' ||
      tool.state !== 'output-available'
    ) {
      continue
    }
    if (tool.output?.items) {
      items.push(...tool.output.items)
    }
  }

  return items
}

function getBrief(message: UIMessage): DocumentBrief | null {
  for (const part of message.parts) {
    const tool = part as {
      type?: string
      state?: string
      output?: DocumentBrief | null
    }
    if (
      tool.type === 'tool-documentBrief' &&
      tool.state === 'output-available' &&
      tool.output
    ) {
      return tool.output
    }
  }
  return null
}

export function MessageBubble({
  message,
  onAsk,
  isTyping = false
}: MessageBubbleProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<{
    label: string
    item: EvidenceItem
  } | null>(null)

  const isUser = message.role === 'user'
  const text = getMessageText(message)
  const evidence = getEvidence(message).map((item, position) => ({
    ...item,
    label: item.label ?? String(item.index ?? position + 1)
  }))
  const brief = getBrief(message)
  const showTyping = !isUser && isTyping && text.length === 0

  function openCitation(label: string) {
    const item = evidence.find((entry) => entry.label === label)
    if (item) {
      setSelectedEvidence({ label, item })
      return
    }
    // The model cited a label with no attached evidence (e.g. an old message or
    // an out-of-range label). Open the modal anyway so the click is never dead.
    setSelectedEvidence({
      label,
      item: {
        label,
        chunkId: '',
        filename: 'Unknown source',
        locator: '',
        excerpt: `No source excerpt is available for [${label}]. The assistant referenced this citation without attaching the matching passage.`,
        why: ''
      }
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] md:max-w-[85%] ${isUser ? '' : 'w-full'}`}>
        {!isUser && brief && <DocumentBriefCard brief={brief} onAsk={onAsk} />}
        <div
          className={`rounded-xl border-2 border-ink px-3 py-3 text-sm leading-6 shadow-card md:px-4 ${
            isUser ? 'bg-accent text-white' : 'bg-white'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : showTyping ? (
            <span className="flex items-center gap-1 py-1">
              <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-ink" />
              <span className="ml-2 text-xs font-semibold text-foreground/60">
                Thinking…
              </span>
            </span>
          ) : (
            <div className="prose prose-sm max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => {
                    const match =
                      typeof href === 'string'
                        ? href.match(/^#citation-([A-Z]?\d+)$/)
                        : null
                    if (!match) {
                      return <a href={href}>{children}</a>
                    }
                    const label = match[1]
                    return (
                      <button
                        type="button"
                        onClick={() => openCitation(label)}
                        className="mx-0.5 inline-block align-baseline text-xs font-bold text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
                      >
                        [{label}]
                      </button>
                    )
                  }
                }}
              >
                {toCitationMarkdown(text)}
              </Markdown>
            </div>
          )}
        </div>
      </div>
      {selectedEvidence && (
        <EvidenceModal
          label={selectedEvidence.label}
          evidence={selectedEvidence.item}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  )
}
