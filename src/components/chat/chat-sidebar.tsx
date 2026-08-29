'use client'

import { useState } from 'react'
import type { ChatItem } from '@/lib/types'

type ChatSidebarProps = {
  chats: ChatItem[]
  draft: boolean
  selectedChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string) => Promise<void>
  fullscreen?: boolean
  onClose?: () => void
}

export function ChatSidebar({
  chats,
  draft,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  fullscreen = false,
  onClose
}: ChatSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function removeChat(id: string) {
    if (deletingId) {
      return
    }
    setDeletingId(id)
    try {
      await onDeleteChat(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <aside
      className={`flex flex-col border-r-2 border-ink bg-zinc-50 ${
        fullscreen ? 'w-full' : 'w-72 shrink-0'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chats"
              className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-base font-extrabold shadow-card md:hidden"
            >
              ✕
            </button>
          )}
          <span className="truncate text-sm font-extrabold tracking-tight">
            Chats
          </span>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="shrink-0 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-extrabold shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
        >
          + New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {chats.length === 0 && !draft ? (
          <p className="px-1 py-2 text-sm leading-6 text-foreground/60">
            No saved conversations yet. Start a new chat to begin.
          </p>
        ) : (
          <ul className="space-y-2">
            {draft && (
              <li>
                <div className="flex items-center rounded-lg border-2 border-ink bg-accent px-3 py-2 text-white shadow-card">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      New conversation
                    </span>
                    <span className="block truncate text-xs text-white/80">
                      No document yet
                    </span>
                  </span>
                </div>
              </li>
            )}
            {chats.map((chat) => {
              const isSelected = chat.id === selectedChatId
              const isDeleting = deletingId === chat.id
              return (
                <li key={chat.id}>
                  <div
                    className={`flex items-center gap-1 rounded-lg border-2 border-ink transition-transform hover:translate-x-0.5 ${
                      isSelected
                        ? 'bg-accent text-white shadow-card'
                        : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-sm font-bold">
                        {chat.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeChat(chat.id)}
                      disabled={deletingId !== null}
                      aria-label={`Delete ${chat.title}`}
                      title="Delete chat"
                      className={`mr-1 grid size-7 shrink-0 place-items-center rounded-md transition-colors ${
                        isSelected ? 'hover:bg-white/20' : 'hover:bg-black/10'
                      } disabled:cursor-default disabled:opacity-50`}
                    >
                      {isDeleting ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        '×'
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
