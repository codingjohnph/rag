import 'server-only'
import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'kleo_session'

export function isGateEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD)
}

export function getSessionHash(): string | null {
  if (!process.env.APP_PASSWORD) {
    return null
  }
  return createHash('sha256').update(process.env.APP_PASSWORD).digest('hex')
}

export function isAuthorized(request: NextRequest): boolean {
  if (!isGateEnabled()) {
    return true
  }
  const expected = getSessionHash()
  return (
    expected !== null && request.cookies.get(COOKIE_NAME)?.value === expected
  )
}
