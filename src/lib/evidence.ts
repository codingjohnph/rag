import 'server-only'
import type { TextUIPart, UIMessage } from 'ai'
import { getChunkForCitation, listDocuments } from '@/lib/db/queries'
import { buildDocumentLetters, formatLocator } from '@/lib/retrieval'
import type { EvidenceItem } from '@/lib/types'

const CITATION_PATTERN = /\[([A-Z]?\d+)\]/g

type EvidenceToolPart = {
  type: string
  state?: string
  output?: { items?: EvidenceItem[] } | null
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/**
 * Resolves a citation label (e.g. "B3") to its underlying chunk:
 * the leading letter maps to a document (by upload order, oldest = A) and the
 * number to the 1-based chunk index within it. Returns null when the label has
 * no matching chunk (out of range, unknown document).
 */
async function resolveLabel(
  chatId: string,
  label: string,
  letterToDocumentId: Map<string, string>,
  firstDocumentId: string | undefined
): Promise<EvidenceItem | null> {
  const parsed = label.match(/^([A-Z])?(\d+)$/)
  if (!parsed) {
    return null
  }
  const letter = parsed[1]
  const numberText = parsed[2]
  const documentId = letter ? letterToDocumentId.get(letter) : firstDocumentId
  if (!documentId) {
    return null
  }

  const chunk = await getChunkForCitation(
    chatId,
    documentId,
    Number(numberText) - 1
  )
  if (!chunk) {
    return null
  }

  return {
    label,
    chunkId: chunk.id,
    filename: chunk.filename,
    locator: formatLocator(chunk.page, chunk.section),
    excerpt: chunk.content,
    why: `Source for the citation [${label}] used in the answer.`
  }
}

/**
 * Ensures every citation label in an assistant message has a matching evidence
 * item. Models occasionally cite a label without passing it to `presentEvidence`;
 * this resolves those labels to their real chunks so the citation is never dead.
 */
export async function completeCitationEvidence(
  messages: UIMessage[],
  chatId: string
): Promise<UIMessage[]> {
  const documents = await listDocuments(chatId)
  const letters = buildDocumentLetters(documents)
  const letterToDocumentId = new Map(
    [...letters].map(([documentId, letter]) => [letter, documentId])
  )
  const firstDocumentId = documents[0]?.id

  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'assistant') {
        return message
      }

      const text = messageText(message)
      const cited = new Set(
        [...text.matchAll(CITATION_PATTERN)].map((match) => match[1])
      )
      if (cited.size === 0) {
        return message
      }

      const evidencePart = message.parts.find(
        (part) =>
          part.type === 'tool-presentEvidence' &&
          part.state === 'output-available'
      ) as EvidenceToolPart | undefined
      const existingLabels = new Set(
        evidencePart?.output?.items?.map((item) => item.label) ?? []
      )
      const missing = [...cited].filter((label) => !existingLabels.has(label))
      if (missing.length === 0) {
        return message
      }

      const resolved = (
        await Promise.all(
          missing.map((label) =>
            resolveLabel(chatId, label, letterToDocumentId, firstDocumentId)
          )
        )
      ).filter((item): item is EvidenceItem => item !== null)

      if (resolved.length === 0) {
        return message
      }

      const parts = message.parts.map((part) => {
        if (
          part.type !== 'tool-presentEvidence' ||
          part.state !== 'output-available'
        ) {
          return part
        }
        const toolPart = part as EvidenceToolPart
        const items = toolPart.output?.items ?? []
        const merged = [...items]
        for (const item of resolved) {
          if (!merged.some((existing) => existing.label === item.label)) {
            merged.push(item)
          }
        }
        return { ...part, output: { items: merged } } as UIMessage['parts'][number]
      })

      return { ...message, parts }
    })
  )
}
