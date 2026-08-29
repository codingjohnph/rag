'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

type AuthGateProps = {
  children: ReactNode
}

type GateState = 'loading' | 'open' | 'locked'

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<GateState>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/gate')
      .then((response) => response.json())
      .then((body: { enabled?: boolean; authorized?: boolean }) => {
        if (cancelled) {
          return
        }
        setState(!body.enabled || body.authorized ? 'open' : 'locked')
      })
      .catch(() => {
        if (!cancelled) {
          setState('open')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const response = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (response.ok) {
      setState('open')
    } else {
      setError('Incorrect password. Try again.')
    }
  }

  if (state === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-zinc-50">
        <span className="size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-xl border-2 border-ink bg-white p-6 shadow-card"
        >
          <h1 className="text-lg font-extrabold tracking-tight">Kleo Doc</h1>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            This demo is password protected. Enter the access key to continue.
          </p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Access key"
            autoFocus
            className="mt-4 w-full rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-semibold outline-none placeholder:text-foreground/40 focus:bg-zinc-50"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={password.length === 0}
            className="mt-4 w-full rounded-full border-2 border-ink bg-accent px-4 py-2.5 text-sm font-extrabold text-white shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-60"
          >
            Unlock
          </button>
        </form>
      </main>
    )
  }

  return <>{children}</>
}
