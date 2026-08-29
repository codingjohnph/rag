import { convertToModelMessages, isStepCount, streamText } from 'ai'
import type { UIMessage } from 'ai'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getChatModel } from '@/lib/ai/providers'
import { isAuthorized } from '@/lib/gate'
import {
  getChat,
  listDocuments,
  replaceChatMessages,
  touchChat,
  upsertMessage
} from '@/lib/db/queries'
import { titleFromQuestion } from '@/lib/files'
import { completeCitationEvidence } from '@/lib/evidence'
import { getMessageText } from '@/lib/messages'
import { buildSystemPrompt } from '@/lib/prompts'
import {
  buildDocumentLetters,
  listChatSources,
  retrieveSources
} from '@/lib/retrieval'
import { buildChatTools } from '@/lib/tools'
import type { DocumentItem } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

type ChatRequest = {
  messages: UIMessage[]
  chatId: string
  justIngested?: boolean
}

function lastUserText(messages: UIMessage[]): string {
  return getMessageText(
    [...messages].reverse().find((message) => message.role === 'user')
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ChatRequest

    if (!body.chatId) {
      return Response.json({ error: 'chatId is required' }, { status: 400 })
    }

    const chat = await getChat(body.chatId)
    if (!chat) {
      return Response.json(
        { error: 'This conversation no longer exists.' },
        { status: 404 }
      )
    }

    const query = lastUserText(body.messages)
    const incoming = body.messages as UIMessage[]

    const lastMessage = incoming[incoming.length - 1]
    if (lastMessage?.role === 'user') {
      await upsertMessage(body.chatId, lastMessage)
      if (chat.title === 'New conversation') {
        await touchChat(body.chatId, titleFromQuestion(query))
      } else {
        await touchChat(body.chatId)
      }
    }

    const documents = await listDocuments(body.chatId)
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

    const letters = buildDocumentLetters(documentItems)

    const sources =
      documents.length > 0 && query.length > 0 && !body.justIngested
        ? await retrieveSources(body.chatId, query, letters)
        : body.justIngested
          ? await listChatSources(
              body.chatId,
              letters,
              undefined,
              documentItems[0]?.id
            )
          : []

    const tools = buildChatTools({
      chatId: body.chatId,
      documents: documentItems,
      sources
    })

    const result = streamText({
      model: getChatModel(),
      system: buildSystemPrompt({
        documents: documentItems,
        sources,
        justIngested: Boolean(body.justIngested)
      }),
      messages: await convertToModelMessages(incoming, {
        tools,
        ignoreIncompleteToolCalls: true
      }),
      tools,
      temperature: 0.2,
      stopWhen: isStepCount(4)
    })

    return result.toUIMessageStreamResponse({
      originalMessages: incoming,
      generateMessageId: () => randomUUID(),
      onEnd: async ({ messages }) => {
        const completed = await completeCitationEvidence(messages, body.chatId)
        await replaceChatMessages(body.chatId, completed)
      }
    })
  } catch (error) {
    console.error('[chat] request failed:', error)
    return Response.json(
      { error: 'We could not start a response. Please try again.' },
      { status: 500 }
    )
  }
}
