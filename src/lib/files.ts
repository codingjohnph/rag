export function titleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]+/g, ' ').trim() || 'New conversation'
}

export function titleFromQuestion(question: string): string {
  const cleaned = question.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= 48) {
    return cleaned || 'New conversation'
  }
  return `${cleaned.slice(0, 48).trim()}…`
}
