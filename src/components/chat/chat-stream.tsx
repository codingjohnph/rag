'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Composer } from './composer'
import { MessageList } from './message-list'
import { ChatError, ChatLoading, EmptyState } from './states'
import { UploadButton } from './upload-button'
import { titleFromFilename } from '@/lib/files'
import { friendlyStreamError } from '@/lib/errors'
import type { ChatItem, DocumentItem } from '@/lib/types'

type ChatStreamProps = {
  chatId: string | null
  onCreated: (chat: ChatItem) => void
}

type LoadChatResponse = {
  chat?: { title: string }
  messages?: UIMessage[]
  documents?: DocumentItem[]
  error?: string
}

type UploadResponse = {
  document?: DocumentItem
  error?: string
}

export function ChatStream({ chatId, onCreated }: ChatStreamProps) {
  const chatIdRef = useRef<string | null>(chatId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    []
  )

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    transport
  })

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [title, setTitle] = useState('New conversation')
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(chatId !== null)
  const [reloadKey, setReloadKey] = useState(0)
  const [ingesting, setIngesting] = useState(false)
  const [createdChatId, setCreatedChatId] = useState<string | null>(null)

  useEffect(() => {
    chatIdRef.current = chatId
  }, [chatId])

  const [previousChatId, setPreviousChatId] = useState(chatId)
  if (chatId !== previousChatId) {
    setPreviousChatId(chatId)
    setTitle(chatId ? 'Conversation' : 'New conversation')
    setDocuments([])
    setLoading(chatId !== null && chatId !== createdChatId)
    setLoadErrorMessage(null)
    setSendError(null)
    if (createdChatId !== null && createdChatId !== chatId) {
      setCreatedChatId(null)
    }
  }

  useEffect(() => {
    if (chatId === null || chatId === createdChatId) {
      return
    }

    let cancelled = false

    async function loadChat() {
      try {
        const response = await fetch(`/api/chats/${chatId}`)
        let body: LoadChatResponse | null = null
        try {
          body = (await response.json()) as LoadChatResponse
        } catch {
          body = null
        }
        if (!response.ok) {
          if (!cancelled) {
            setLoadErrorMessage(
              response.status === 404
                ? 'This conversation no longer exists.'
                : body?.error ??
                    'This conversation could not be loaded. Please try again.'
            )
          }
          return
        }
        if (body && !cancelled) {
          setLoadErrorMessage(null)
          setTitle(body.chat?.title ?? 'Conversation')
          setMessages(body.messages ?? [])
          setDocuments(body.documents ?? [])
        }
      } catch {
        if (!cancelled) {
          setLoadErrorMessage(
            "Couldn't reach the server. Check your connection and try again."
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadChat()

    return () => {
      cancelled = true
    }
  }, [chatId, setMessages, reloadKey, createdChatId])

  async function ensureChat(): Promise<string> {
    if (chatIdRef.current) {
      return chatIdRef.current
    }
    const response = await fetch('/api/chats', { method: 'POST' })
    const body = (await response.json()) as { chat?: ChatItem }
    if (!response.ok || !body.chat) {
      throw new Error('Could not start a conversation.')
    }
    chatIdRef.current = body.chat.id
    setMessages([])
    setCreatedChatId(body.chat.id)
    setLoading(false)
    onCreated(body.chat)
    return body.chat.id
  }

  async function handleSend(text: string) {
    try {
      const id = await ensureChat()
      setSendError(null)
      await sendMessage({ text }, { body: { chatId: id } })
    } catch (failure) {
      // Failures before the stream (chat creation, network) never reach
      // `error` from useChat, so surface them here.
      setSendError(friendlyStreamError(failure))
    }
  }

  async function handleUpload(file: File) {
    setIngesting(true)
    try {
      const id = await ensureChat()
      const formData = new FormData()
      formData.append('chatId', id)
      formData.append('file', file)
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      })
      let body: UploadResponse | null = null
      try {
        body = (await response.json()) as UploadResponse
      } catch {
        body = null
      }
      if (!response.ok || !body?.document) {
        throw new Error(
          body?.error
            ? friendlyStreamError(new Error(body.error))
            : 'We could not index this file. Please try again.'
        )
      }
      const uploaded = body.document as DocumentItem
      setDocuments((current) => [
        uploaded,
        ...current.filter((document) => document.id !== uploaded.id)
      ])
      setTitle(titleFromFilename(uploaded.filename))
      try {
        await sendMessage(
          {
            text: `I've uploaded ${uploaded.filename}. Confirm it is uploaded and give a brief overview.`
          },
          { body: { chatId: id, justIngested: true } }
        )
      } catch {
        // Stream errors surface through `error`.
      }
    } finally {
      setIngesting(false)
    }
  }

  const isBusy = ingesting || status === 'submitted' || status === 'streaming'
  const hasDocuments = documents.length > 0
  const isDraft = chatId === null
  const streamError = error ? friendlyStreamError(error) : null

  useEffect(() => {
    stickToBottom.current = true
  }, [chatId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    const maxScroll = container.scrollHeight - container.clientHeight
    const lastMessage = messages[messages.length - 1]
    const justSent = lastMessage?.role === 'user'
    if (
      stickToBottom.current ||
      container.scrollTop >= maxScroll - 120 ||
      justSent
    ) {
      container.scrollTop = maxScroll
    }
  }, [messages, isBusy])

  function handleScroll() {
    const container = scrollRef.current
    if (!container) {
      return
    }
    const maxScroll = container.scrollHeight - container.clientHeight
    stickToBottom.current = container.scrollTop >= maxScroll - 120
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="truncate text-xs text-foreground/60">
            {hasDocuments
              ? documents.map((document) => document.filename).join(', ')
              : 'No document indexed yet'}
          </p>
        </div>
        {!isDraft && (status === 'submitted' || status === 'streaming') && (
          <button
            type="button"
            onClick={() => stop()}
            className="shrink-0 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-extrabold shadow-card"
          >
            Stop
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {isDraft ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
            <EmptyState
              title="Drop a document into the conversation"
              description="Upload a PDF, TXT, or Markdown file, then ask questions grounded in its content."
            />
            <UploadButton
              onUpload={handleUpload}
              label="Upload a document"
              large
            />
          </div>
        ) : loading ? (
          <ChatLoading />
        ) : loadErrorMessage ? (
          <ChatError
            message={loadErrorMessage}
            onRetry={() => {
              setLoadErrorMessage(null)
              setReloadKey((key) => key + 1)
            }}
          />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
            {hasDocuments ? (
              <EmptyState
                title="Ask about your documents"
                description="Ask a question below and the assistant will answer using the uploaded files."
              />
            ) : (
              <EmptyState
                title="Drop a document into the conversation"
                description="Upload a PDF, TXT, or Markdown file, then ask questions grounded in its content."
              />
            )}
            {!hasDocuments && (
              <UploadButton
                onUpload={handleUpload}
                label="Upload a document"
                large
              />
            )}
          </div>
        ) : (
          <MessageList
            messages={messages}
            isBusy={isBusy}
            onAsk={(question) => void handleSend(question)}
          />
        )}
      </div>

      <Composer
        onSend={(text) => void handleSend(text)}
        onUpload={handleUpload}
        disabled={isBusy}
        error={streamError ?? sendError ?? undefined}
      />
    </div>
  )
}
