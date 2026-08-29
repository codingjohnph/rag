'use client'

import type { UIMessage } from 'ai'
import { MessageBubble } from './message-bubble'

type MessageListProps = {
  messages: UIMessage[]
  isBusy: boolean
  onAsk?: (question: string) => void
}

const typingPlaceholder: UIMessage = {
  id: 'typing',
  role: 'assistant',
  parts: []
}

export function MessageList({ messages, isBusy, onAsk }: MessageListProps) {
  const lastMessage = messages[messages.length - 1]
  const lastIsAssistant = lastMessage?.role === 'assistant'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onAsk={onAsk}
          isTyping={
            isBusy && lastIsAssistant && index === messages.length - 1
          }
        />
      ))}
      {isBusy && !lastIsAssistant && (
        <MessageBubble message={typingPlaceholder} onAsk={onAsk} isTyping />
      )}
    </div>
  )
}
