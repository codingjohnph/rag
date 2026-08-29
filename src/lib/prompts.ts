import type { Source } from '@/lib/retrieval'
import type { DocumentItem } from '@/lib/types'

export function buildSystemPrompt(options: {
  documents: DocumentItem[]
  sources: Source[]
  justIngested: boolean
}): string {
  const { documents, sources, justIngested } = options

  const lines = [
    'You are a precise research assistant. Answer questions using only the document excerpts below.',
    '',
    ...(documents.length > 0
      ? [
          `Uploaded documents:\n${documents
            .map((document) => `- ${document.filename}`)
            .join('\n')}`
        ]
      : []),
    '',
    'Document excerpts:',
    ...(sources.length > 0
      ? sources.map((source) => `[${source.label}] ${source.excerpt}`)
      : ['(No excerpts available.)']),
    '',
    'Rules:',
    '- Ground every factual claim in the excerpts. Never invent information not present in them.',
    '- If the excerpts do not contain the answer, state that you cannot find it in the documents.',
    '- Cite every claim inline with bracket labels like [A1] or [B2] that match the numbered excerpts.',
    '- Always call the presentEvidence tool with the same citation labels you used in the text (e.g. A1, B2) so the UI can display the real source cards.',
    "- Answer concisely, in the user's language, with clear structure."
  ]

  if (justIngested) {
    lines.push(
      '- The user just uploaded a document. Call the documentBrief tool first, then call the presentEvidence tool with the citation numbers you used in the text, then answer briefly.'
    )
  }

  return lines.join('\n')
}
