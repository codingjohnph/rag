import { getChat, touchChat } from '@/lib/db/queries'
import { isAuthorized } from '@/lib/gate'
import { ingestDocument } from '@/lib/documents/ingest'
import { DocumentIngestError } from '@/lib/documents/errors'
import { titleFromFilename } from '@/lib/files'
import { formatBytes } from '@/lib/errors'
import { MAX_FILE_BYTES } from '@/lib/constants'
import { NextRequest } from 'next/server'
import type { DocumentItem } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown'
])

function resolveMimeType(filename: string, reported: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'pdf') {
    return 'application/pdf'
  }
  if (extension === 'txt') {
    return 'text/plain'
  }
  if (extension === 'md' || extension === 'markdown') {
    return 'text/markdown'
  }
  return reported || 'text/plain'
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: 'We could not read the upload. Please try again.' },
      { status: 400 }
    )
  }

  const chatId = String(formData.get('chatId') ?? '')
  const file = formData.get('file')

  if (!chatId) {
    return Response.json({ error: 'chatId is required' }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return Response.json(
      { error: 'Please choose a file to upload.' },
      { status: 400 }
    )
  }

  const chat = await getChat(chatId)
  if (!chat) {
    return Response.json(
      { error: 'This conversation no longer exists.' },
      { status: 404 }
    )
  }

  const mimeType = resolveMimeType(file.name, file.type)
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return Response.json(
      { error: 'Unsupported file type. Upload a PDF, TXT, or Markdown file.' },
      { status: 415 }
    )
  }

  if (file.size === 0) {
    return Response.json(
      { error: 'The file is empty. Choose a file that contains text.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      {
        error: `The file is too large. The maximum size is ${formatBytes(MAX_FILE_BYTES)}.`
      },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const document = await ingestDocument({
      chatId,
      filename: file.name,
      mimeType,
      sizeBytes: buffer.length,
      buffer
    })

    if (chat.title === 'New conversation') {
      await touchChat(chatId, titleFromFilename(file.name))
    } else {
      await touchChat(chatId)
    }

    const documentItem: DocumentItem = {
      id: document.id,
      chatId: document.chatId,
      filename: document.filename,
      mimeType: document.mimeType,
      pageCount: document.pageCount,
      chunkCount: document.chunkCount,
      status: document.status as DocumentItem['status'],
      createdAt: document.createdAt.toISOString()
    }

    return Response.json({ document: documentItem })
  } catch (error) {
    if (error instanceof DocumentIngestError) {
      return Response.json({ error: error.message }, { status: 422 })
    }
    console.error('[documents] ingest failed:', error)
    return Response.json(
      { error: 'We could not index this file. Please try again.' },
      { status: 500 }
    )
  }
}
