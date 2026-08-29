import 'server-only'
import { embedTexts } from '@/lib/ai/embed'
import { listChatChunks, searchChunks } from '@/lib/db/queries'

export type Source = {
  label: string
  chunkId: string
  filename: string
  page: number | null
  section: string | null
  excerpt: string
  similarity: number
}

const EXCERPT_LENGTH = 500

export function buildDocumentLetters(
  documents: Array<{ id: string; createdAt: string | Date }>
): Map<string, string> {
  const sorted = [...documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  return new Map(
    sorted.map((document, index) => [
      document.id,
      String.fromCharCode(65 + index)
    ])
  )
}

function sourceLabel(
  letters: Map<string, string>,
  documentId: string,
  chunkIndex: number
): string {
  const letter = letters.get(documentId) ?? 'A'
  return `${letter}${Number(chunkIndex) + 1}`
}

export async function retrieveSources(
  chatId: string,
  query: string,
  letters: Map<string, string>,
  limit = 8
): Promise<Source[]> {
  const [embedding] = await embedTexts([query])
  const rows = await searchChunks(chatId, embedding, limit)

  if (rows.length === 0) {
    return listChatSources(chatId, letters, limit)
  }

  return rows.map((row) => ({
    label: sourceLabel(letters, row.documentId, row.index),
    chunkId: row.id,
    filename: row.filename,
    page: row.page === null ? null : Number(row.page),
    section: row.section === null ? null : row.section,
    excerpt: truncate(row.content, EXCERPT_LENGTH),
    similarity: Number(row.similarity)
  }))
}

export async function listChatSources(
  chatId: string,
  letters: Map<string, string>,
  limit = 8,
  documentId?: string
): Promise<Source[]> {
  const rows = await listChatChunks(chatId, limit, documentId)
  return rows.map((row) => ({
    label: sourceLabel(letters, row.documentId, row.index),
    chunkId: row.id,
    filename: row.filename,
    page: row.page === null ? null : Number(row.page),
    section: row.section === null ? null : row.section,
    excerpt: truncate(row.content, EXCERPT_LENGTH),
    similarity: 0
  }))
}

export function formatLocator(
  page: number | null,
  section: string | null
): string {
  if (section) {
    return section
  }
  if (page !== null) {
    return `Page ${page}`
  }
  return 'Excerpt'
}

function truncate(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength)}…`
}
