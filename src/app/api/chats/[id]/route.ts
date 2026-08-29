import {
  deleteChat,
  getChat,
  listDocuments,
  listMessages
} from '@/lib/db/queries'
import { isAuthorized } from '@/lib/gate'
import { NextRequest } from 'next/server'
import type { ChatItem, DocumentItem } from '@/lib/types'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const chat = await getChat(id)
  if (!chat) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const [messages, documents] = await Promise.all([
    listMessages(id),
    listDocuments(id)
  ])

  const chatItem: ChatItem = {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString()
  }

  const documentItems: DocumentItem[] = documents.map((document) => ({
    id: document.id,
    chatId: document.chatId,
    filename: document.filename,
    mimeType: document.mimeType,
    pageCount: document.pageCount,
    chunkCount: document.chunkCount,
    status: document.status as DocumentItem['status'],
    createdAt: document.createdAt.toISOString()
  }))

  return Response.json({
    chat: chatItem,
    messages,
    documents: documentItems
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const chat = await getChat(id)
  if (!chat) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  await deleteChat(id)

  return Response.json({ ok: true })
}
