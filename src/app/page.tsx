import { listChats } from '@/lib/db/queries'
import { ChatApp } from '@/components/chat/chat-app'
import { AuthGate } from '@/components/chat/auth-gate'
import type { ChatItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

type HomeProps = {
  searchParams: Promise<{ chat?: string; new?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams

  const rows = await listChats()

  const chatsList: ChatItem[] = rows.map((chat) => ({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString()
  }))

  return (
    <AuthGate>
      <ChatApp
        chats={chatsList}
        selectedChatId={params.chat ?? null}
        initialDraft={params.new !== undefined}
      />
    </AuthGate>
  )
}
