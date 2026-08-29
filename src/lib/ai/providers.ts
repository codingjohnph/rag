import 'server-only'
import { deepseek } from '@ai-sdk/deepseek'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

const DEFAULT_MODEL = 'deepseek:deepseek-chat'

const [provider, modelId] = (process.env.CHAT_MODEL ?? DEFAULT_MODEL).split(
  ':',
  2
)

export function getChatModel(): LanguageModel {
  switch (provider) {
    case 'google':
      return google(modelId)
    case 'deepseek':
      return deepseek(modelId)
    case 'openai':
    default:
      return openai(modelId)
  }
}
