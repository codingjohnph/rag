import 'server-only'
import { embedMany } from 'ai'
import { google } from '@ai-sdk/google'

const embeddingModel = google.embedding('gemini-embedding-2')

export async function embedTexts(values: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values,
    providerOptions: {
      google: { outputDimensionality: 768 }
    }
  })
  return embeddings
}
