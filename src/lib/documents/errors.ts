/**
 * Thrown when a file can't be indexed for a reason the user can fix
 * (unreadable PDF, no extractable text, etc). The API surfaces `message`
 * directly as the response error.
 */
export class DocumentIngestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentIngestError'
  }
}
