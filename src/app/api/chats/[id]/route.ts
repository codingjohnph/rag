import {
  deleteChat,
  getChat,
  listDocuments,
  listMessages
} from '@/lib/db/queries'
import { isAuthorized } from '@/lib/gate'
import { completeCitationEvidence } from '@/lib/evidence'
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

  try {
    const chat = await getChat(id)
    if (!chat) {
      return Response.json(
        { error: 'This conversation no longer exists.' },
        { status: 404 }
      )
    }

    const [messages, documents] = await Promise.all([
      listMessages(id),
      listDocuments(id)
    ])

    const completedMessages = await completeCitationEvidence(messages, id)

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
      messages: completedMessages,
      documents: documentItems
    })
  } catch (error) {
    console.error('[chats] load failed:', error)
    return Response.json(
      { error: 'This conversation could not be loaded. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const chat = await getChat(id)
    if (!chat) {
      return Response.json(
        { error: 'This conversation no longer exists.' },
        { status: 404 }
      )
    }

    await deleteChat(id)

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[chats] delete failed:', error)
    return Response.json(
      { error: 'We could not delete this conversation. Please try again.' },
      { status: 500 }
    )
  }
}
