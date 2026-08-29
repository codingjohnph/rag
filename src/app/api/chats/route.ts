import { createChat, listChats } from '@/lib/db/queries'
import { isAuthorized } from '@/lib/gate'
import { NextRequest } from 'next/server'
import type { ChatItem } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const rows = await listChats()

    const chatList: ChatItem[] = rows.map((chat) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString()
    }))

    return Response.json({ chats: chatList })
  } catch (error) {
    console.error('[chats] list failed:', error)
    return Response.json(
      { error: 'We could not load your conversations. Please try again.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const chat = await createChat()
    const chatItem: ChatItem = {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString()
    }
    return Response.json({ chat: chatItem })
  } catch (error) {
    console.error('[chats] create failed:', error)
    return Response.json(
      { error: 'We could not start a conversation. Please try again.' },
      { status: 500 }
    )
  }
}
