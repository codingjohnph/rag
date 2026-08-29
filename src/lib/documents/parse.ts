import 'server-only'
import { extractText } from 'unpdf'

export type ParsedSegment = {
  page: number | null
  section: string | null
  text: string
}

export type ParsedDocument = {
  segments: ParsedSegment[]
  totalPages: number | null
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedDocument> {
  if (mimeType === 'application/pdf') {
    return parsePdf(buffer)
  }
  return parsePlain(buffer)
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const data = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  )
  const { text, totalPages } = await extractText(data, { mergePages: false })
  const segments = text.map((pageText, index) => ({
    page: index + 1,
    section: null,
    text: pageText
  }))
  return { segments, totalPages }
}

function parsePlain(buffer: Buffer): ParsedDocument {
  const content = buffer.toString('utf-8')
  return { segments: splitMarkdownSections(content), totalPages: null }
}

function splitMarkdownSections(content: string): ParsedSegment[] {
  const lines = content.split('\n')
  const segments: ParsedSegment[] = []
  let section: string | null = null
  let buffer: string[] = []

  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text.length > 0) {
      segments.push({ page: null, section, text })
    }
    buffer = []
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flush()
      section = heading[2].trim()
    } else {
      buffer.push(line)
    }
  }
  flush()
  return segments
}
