import type { ParsedDocument } from './parse'

export type Chunk = {
  index: number
  content: string
  page: number | null
  section: string | null
}

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200

export function chunkDocument(parsed: ParsedDocument): Chunk[] {
  const chunks: Chunk[] = []
  let index = 0

  for (const segment of parsed.segments) {
    for (const piece of splitSegment(segment.text)) {
      const content = piece.trim()
      if (content.length === 0) {
        continue
      }
      chunks.push({
        index,
        content,
        page: segment.page,
        section: segment.section
      })
      index += 1
    }
  }

  return chunks
}

function splitSegment(text: string): string[] {
  if (text.length <= CHUNK_SIZE) {
    return [text]
  }

  const pieces: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)

    if (end < text.length) {
      const boundary = text.lastIndexOf('\n\n', end)
      if (boundary > start + CHUNK_SIZE / 2) {
        end = boundary
      } else {
        const space = text.lastIndexOf(' ', end)
        if (space > start + CHUNK_SIZE / 2) {
          end = space
        }
      }
    }

    pieces.push(text.slice(start, end))
    if (end >= text.length) {
      break
    }
    start = Math.max(start, end - CHUNK_OVERLAP)
    if (start >= end) {
      start = end
    }
  }

  return pieces
}
