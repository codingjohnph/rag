import { insertChunks, insertDocument } from '@/lib/db/queries'
import { embedTexts } from '@/lib/ai/embed'
import { DocumentIngestError } from './errors'
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
  let parsed
  try {
    parsed = await parseDocument(buffer, mimeType)
  } catch {
    throw new DocumentIngestError(
      mimeType === 'application/pdf'
        ? 'This PDF could not be read. It may be corrupted or password-protected.'
        : 'This file could not be read. It may be corrupted or in an unsupported format.'
    )
  }

  const chunks = chunkDocument(parsed)

  if (chunks.length === 0) {
    throw new DocumentIngestError(
      'No readable text was found in this file. It may be a scanned PDF or an image-based document.'
    )
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
