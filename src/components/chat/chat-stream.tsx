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
import type { ChatItem, DocumentItem } from '@/lib/types'

type ChatStreamProps = {
  chatId: string | null
  onCreated: (chat: ChatItem) => void
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
  const [loadError, setLoadError] = useState(false)
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
    setLoadError(false)
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
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(true)
          }
          return
        }
        const body = (await response.json()) as {
          chat: { title: string }
          messages: UIMessage[]
          documents: DocumentItem[]
        }
        if (!cancelled) {
          setTitle(body.chat.title)
          setMessages(body.messages)
          setDocuments(body.documents)
        }
      } catch {
        if (!cancelled) {
          setLoadError(true)
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
      await sendMessage({ text }, { body: { chatId: id } })
    } catch {
      // Stream errors surface through `error`.
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
      const body = (await response.json()) as {
        document?: DocumentItem
        error?: string
      }
      if (!response.ok || !body.document) {
        throw new Error(body.error ?? 'Upload failed. Please try again.')
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
        ) : loadError ? (
          <ChatError
            message="Failed to load this conversation."
            onRetry={() => setReloadKey((key) => key + 1)}
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
        error={error?.message}
      />
    </div>
  )
}
