'use client'

import type { ChatItem } from '@/lib/types'
import { ChatStream } from './chat-stream'
import { EmptyState } from './states'

type ChatPanelProps = {
  chat: ChatItem | null
  draft: boolean
  onNewChat: () => void
  onChatCreated: (chat: ChatItem) => void
}

export function ChatPanel({
  chat,
  draft,
  onNewChat,
  onChatCreated
}: ChatPanelProps) {
  if (!chat && !draft) {
    return (
      <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-8">
        <EmptyState
          title="Start a conversation"
          description="Create a new chat, upload a PDF, TXT, or Markdown file, then ask questions grounded in its content."
          action={
            <button
              type="button"
              onClick={onNewChat}
              className="mt-2 rounded-full border-2 border-ink bg-accent px-8 py-3.5 text-sm font-extrabold text-white shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
            >
              New chat
            </button>
          }
        />
      </main>
    )
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatStream
        key="active"
        chatId={draft ? null : (chat?.id ?? null)}
        onCreated={onChatCreated}
      />
    </main>
  )
}
