import { NextRequest, NextResponse } from 'next/server'
import { getSessionHash, isAuthorized, isGateEnabled } from '@/lib/gate'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export async function GET(request: NextRequest) {
  return NextResponse.json({
    enabled: isGateEnabled(),
    authorized: isAuthorized(request)
  })
}

export async function POST(request: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json({ ok: true })
  }

  const body = (await request.json().catch(() => ({}))) as {
    password?: string
  }

  if (body.password && body.password === process.env.APP_PASSWORD) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('kleo_session', getSessionHash() ?? '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/'
    })
    return response
  }

  return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('kleo_session', '', { maxAge: 0, path: '/' })
  return response
}
