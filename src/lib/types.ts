export type ChatItem = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type DocumentItem = {
  id: string
  chatId: string
  filename: string
  mimeType: string
  pageCount: number | null
  chunkCount: number
  status: 'processing' | 'ready' | 'error'
  createdAt: string
}

export type EvidenceItem = {
  label?: string
  index?: number
  chunkId: string
  filename: string
  locator: string
  excerpt: string
  why: string
}

export type DocumentBrief = {
  filename: string
  kind: string
  pageCount: number | null
  chunkCount: number
  summary: string
  keyTopics: string[]
  suggestedQuestions: string[]
}
