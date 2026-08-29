'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatItem } from '@/lib/types'
import { ChatPanel } from './chat-panel'
import { ChatSidebar } from './chat-sidebar'

type ChatAppProps = {
  chats: ChatItem[]
  selectedChatId: string | null
  initialDraft: boolean
}

export function ChatApp({ chats, selectedChatId, initialDraft }: ChatAppProps) {
  const router = useRouter()
  const [chatList, setChatList] = useState<ChatItem[]>(chats)
  const [chatId, setChatId] = useState<string | null>(selectedChatId)
  const [draft, setDraft] = useState(initialDraft && selectedChatId === null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [previousChats, setPreviousChats] = useState(chats)

  if (previousChats !== chats) {
    setPreviousChats(chats)
    setChatList(chats)
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (chatId) {
      params.set('chat', chatId)
    } else if (draft) {
      params.set('new', '1')
    }
    const query = params.toString()
    router.replace(query ? `/?${query}` : '/', { scroll: false })
  }, [chatId, draft, router])

  function selectChat(id: string) {
    setChatId(id)
    setDraft(false)
    setSidebarOpen(false)
  }

  function handleNewChat() {
    setChatId(null)
    setDraft(true)
    setSidebarOpen(false)
  }

  function handleChatCreated(chat: ChatItem) {
    setChatId(chat.id)
    setDraft(false)
    setChatList((current) => [
      chat,
      ...current.filter((item) => item.id !== chat.id)
    ])
  }

  async function handleDeleteChat(id: string): Promise<void> {
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' })
    } catch {
      // Remove from the list even if the request failed.
    }
    setChatList((current) => current.filter((chat) => chat.id !== id))
    if (chatId === id) {
      setChatId(null)
      setDraft(false)
    }
  }

  const selectedChat = chatList.find((chat) => chat.id === chatId) ?? null
  const sidebarProps = {
    chats: chatList,
    draft,
    selectedChatId: chatId,
    onSelectChat: selectChat,
    onNewChat: handleNewChat,
    onDeleteChat: handleDeleteChat
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <ChatSidebar {...sidebarProps} />
      </div>

      {/* Mobile full-screen sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <ChatSidebar
            {...sidebarProps}
            fullscreen
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b-2 border-ink bg-zinc-50 px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chats"
            className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-lg font-extrabold shadow-card"
          >
            ☰
          </button>
          <span className="truncate text-sm font-extrabold tracking-tight">
            Kleo Doc
          </span>
        </div>

        <ChatPanel
          chat={selectedChat}
          draft={draft}
          onNewChat={handleNewChat}
          onChatCreated={handleChatCreated}
        />
      </div>
    </div>
  )
}
