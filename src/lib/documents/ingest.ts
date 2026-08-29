import { insertChunks, insertDocument } from '@/lib/db/queries'
import { embedTexts } from '@/lib/ai/embed'
import { chunkDocument } from './chunk'
import { parseDocument } from './parse'

export type IngestInput = {
  chatId: string
  filename: string
  mimeType: string
  sizeBytes: number
  buffer: Buffer
}

export async function ingestDocument({
  chatId,
  filename,
  mimeType,
  sizeBytes,
  buffer
}: IngestInput) {
  const parsed = await parseDocument(buffer, mimeType)
  const chunks = chunkDocument(parsed)

  if (chunks.length === 0) {
    throw new Error('No extractable text was found in this file.')
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content))

  const document = await insertDocument({
    chatId,
    filename,
    mimeType,
    sizeBytes,
    pageCount: parsed.totalPages,
    chunkCount: chunks.length
  })

  await insertChunks(
    chunks.map((chunk, index) => ({
      documentId: document.id,
      chatId,
      index: chunk.index,
      content: chunk.content,
      page: chunk.page,
      section: chunk.section,
      embedding: embeddings[index]
    }))
  )

  return document
}
