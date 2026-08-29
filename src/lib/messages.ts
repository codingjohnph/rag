import type { TextUIPart, UIMessage } from 'ai'

export function getMessageText(message: UIMessage | undefined): string {
  if (!message) {
    return ''
  }
  return message.parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('')
}
