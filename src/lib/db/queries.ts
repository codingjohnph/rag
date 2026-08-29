import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, not, sql } from 'drizzle-orm'
import type { UIMessage } from 'ai'
import { db } from '@/db'
import { chats, documentChunks, documents, messages } from '@/db/schema'
import { getMessageText } from '@/lib/messages'

export async function createChat(title = 'New conversation') {
  const [chat] = await db.insert(chats).values({ title }).returning()
  return chat
}

export async function listChats() {
  return db
    .select()
    .from(chats)
    .where(isNull(chats.deletedAt))
    .orderBy(desc(chats.updatedAt))
}

export async function getChat(chatId: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), isNull(chats.deletedAt)))
    .limit(1)
  return chat ?? null
}

export async function touchChat(chatId: string, title?: string) {
  await db
    .update(chats)
    .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
    .where(eq(chats.id, chatId))
}

export async function deleteChat(chatId: string) {
  await db
    .update(chats)
    .set({ deletedAt: new Date() })
    .where(eq(chats.id, chatId))
}

export async function listMessages(chatId: string): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt))
  return rows.map((row) => row.data as UIMessage)
}

export async function upsertMessage(chatId: string, message: UIMessage) {
  const id = message.id || randomUUID()
  await db
    .insert(messages)
    .values({
      id,
      chatId,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: getMessageText(message),
      data: message
    })
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        role: sql`excluded.role`,
        content: sql`excluded.content`,
        data: sql`excluded.data`
      }
    })
}

export async function replaceChatMessages(chatId: string, next: UIMessage[]) {
  const ids = next.map((message) => message.id || randomUUID())

  if (ids.length === 0) {
    await db.delete(messages).where(eq(messages.chatId, chatId))
    return
  }

  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), not(inArray(messages.id, ids))))

  for (const message of next) {
    await upsertMessage(chatId, message)
  }
}

export async function listDocuments(chatId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.chatId, chatId))
    .orderBy(desc(documents.createdAt))
}

export async function insertDocument(values: {
  chatId: string
  filename: string
  mimeType: string
  sizeBytes: number
  pageCount: number | null
  chunkCount: number
}) {
  const [document] = await db
    .insert(documents)
    .values({ ...values, status: 'ready' })
    .returning()
  return document
}

export async function insertChunks(
  values: Array<{
    documentId: string
    chatId: string
    index: number
    content: string
    page: number | null
    section: string | null
    embedding: number[]
  }>
) {
  if (values.length === 0) {
    return
  }
  await db.insert(documentChunks).values(values)
}

export async function searchChunks(
  chatId: string,
  embedding: number[],
  limit = 8
) {
  const vector = `[${embedding.join(',')}]`
  return db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      index: documentChunks.index,
      content: documentChunks.content,
      page: documentChunks.page,
      section: documentChunks.section,
      filename: documents.filename,
      similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${vector}::vector)`
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(eq(documentChunks.chatId, chatId))
    .orderBy(sql`${documentChunks.embedding} <=> ${vector}::vector`)
    .limit(limit)
}

export async function listChatChunks(
  chatId: string,
  limit = 8,
  documentId?: string
) {
  const conditions = [eq(documentChunks.chatId, chatId)]
  if (documentId) {
    conditions.push(eq(documentChunks.documentId, documentId))
  }
  return db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      index: documentChunks.index,
      content: documentChunks.content,
      page: documentChunks.page,
      section: documentChunks.section,
      filename: documents.filename
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(and(...conditions))
    .orderBy(asc(documentChunks.index))
    .limit(limit)
}

export async function getChunksByIds(ids: string[], chatId: string) {
  if (ids.length === 0) {
    return []
  }
  return db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      page: documentChunks.page,
      section: documentChunks.section,
      filename: documents.filename
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(eq(documentChunks.chatId, chatId), inArray(documentChunks.id, ids))
    )
}
