import { tool } from 'ai'
import { z } from 'zod'
import { getChunksByIds } from '@/lib/db/queries'
import { formatLocator } from '@/lib/retrieval'
import type { Source } from '@/lib/retrieval'
import type { DocumentBrief, DocumentItem, EvidenceItem } from '@/lib/types'

export function buildChatTools(options: {
  chatId: string
  documents: DocumentItem[]
  sources: Source[]
}) {
  const latestDocument = options.documents[0]

  const presentEvidence = tool({
    description:
      'Show expandable evidence cards for the sources used in the answer. Call this before answering any factual question about the uploaded documents. Use the citation labels from the numbered excerpts. Prefer the most relevant passages.',
    inputSchema: z.object({
      citations: z
        .array(
          z.object({
            label: z
              .string()
              .describe(
                'The citation label from the numbered document excerpts, e.g. A1 or B2.'
              ),
            why: z
              .string()
              .describe('One sentence on how this excerpt supports the answer.')
          })
        )
        .min(1)
        .max(24)
    }),
    execute: async ({ citations }): Promise<{ items: EvidenceItem[] }> => {
      const chosen = citations.slice(0, 8)
      const sourceByLabel = new Map(
        options.sources.map((source) => [source.label, source])
      )
      const rows = await getChunksByIds(
        chosen
          .map((citation) => sourceByLabel.get(citation.label)?.chunkId)
          .filter((chunkId): chunkId is string => Boolean(chunkId)),
        options.chatId
      )
      const byId = new Map(rows.map((row) => [row.id, row]))

      const items = chosen.flatMap((citation) => {
        const source = sourceByLabel.get(citation.label)
        if (!source) {
          return []
        }
        const row = byId.get(source.chunkId)
        if (!row) {
          return []
        }
        return [
          {
            label: source.label,
            chunkId: row.id,
            filename: row.filename,
            locator: formatLocator(row.page, row.section),
            excerpt: row.content,
            why: citation.why
          } satisfies EvidenceItem
        ]
      })

      return { items }
    }
  })

  const documentBrief = tool({
    description:
      'Show a structured overview right after a document is uploaded. Include a short summary, key topics, and useful follow-up questions.',
    inputSchema: z.object({
      summary: z
        .string()
        .describe('2-3 sentences describing what the document is about.'),
      keyTopics: z
        .array(z.string())
        .min(1)
        .max(12)
        .describe('Concrete topics or sections found in the document.'),
      suggestedQuestions: z
        .array(z.string())
        .min(1)
        .max(8)
        .describe('Questions the user can ask next, grounded in the document.')
    }),
    execute: async ({
      summary,
      keyTopics,
      suggestedQuestions
    }): Promise<DocumentBrief> => {
      return {
        filename: latestDocument?.filename ?? 'Uploaded document',
        kind: latestDocument?.mimeType ?? 'unknown',
        pageCount: latestDocument?.pageCount ?? null,
        chunkCount: latestDocument?.chunkCount ?? 0,
        summary,
        keyTopics: keyTopics.slice(0, 6),
        suggestedQuestions: suggestedQuestions.slice(0, 4)
      }
    }
  })

  return { presentEvidence, documentBrief }
}
