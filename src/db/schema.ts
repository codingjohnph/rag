import { randomUUID } from 'node:crypto'
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from 'drizzle-orm/pg-core'

const vector = customType<{ data: number[] }>({
  dataType: () => 'vector(768)',
  toDriver: (value) => `[${value.join(',')}]`,
  fromDriver: (value) => {
    const raw = String(value).replace(/^\[/, '').replace(/\]$/, '')
    return raw.split(',').map(Number)
  }
})

export const chats = pgTable('chats', {
  id: text('id').primaryKey().$defaultFn(randomUUID),
  title: text('title').notNull().default('New conversation'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
})

export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    pageCount: integer('page_count'),
    chunkCount: integer('chunk_count').notNull().default(0),
    status: text('status', { enum: ['processing', 'ready', 'error'] })
      .notNull()
      .default('processing'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [index('documents_chat_id_idx').on(table.chatId)]
)

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    content: text('content').notNull(),
    page: integer('page'),
    section: text('section'),
    embedding: vector('embedding')
  },
  (table) => [
    index('document_chunks_document_id_idx').on(table.documentId),
    index('document_chunks_chat_id_idx').on(table.chatId),
    index('document_chunks_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.asc().op('vector_cosine_ops')
    )
  ]
)

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull().default(''),
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [index('messages_chat_id_idx').on(table.chatId)]
)

export type Document = typeof documents.$inferSelect
export type DocumentChunk = typeof documentChunks.$inferSelect
export type Chat = typeof chats.$inferSelect
export type Message = typeof messages.$inferSelect
