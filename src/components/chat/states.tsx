'use client'

import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex max-w-lg flex-col items-center gap-3 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-white shadow-card"
      >
        <DocumentIcon className="size-7" />
      </span>
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm leading-6 text-foreground/70">{description}</p>
      )}
      {action}
    </div>
  )
}

export function ChatLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
      {/* <p className="flex items-center gap-2 text-sm font-semibold text-foreground/60">
        <span className="size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        Loading conversation…
      </p> */}
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`animate-pulse rounded-xl border-2 border-ink bg-white p-4 shadow-card ${
            index === 1 ? 'ml-16' : ''
          }`}
        >
          <div className="h-3 w-2/3 rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-3/4 rounded bg-zinc-200" />
        </div>
      ))}
    </div>
  )
}

export function ChatError({
  message,
  onRetry
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-white shadow-card"
      >
        <ErrorIcon className="size-7" />
      </span>
      <h2 className="text-xl font-extrabold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm leading-6 text-foreground/70">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border-2 border-ink bg-accent px-5 py-2 text-sm font-extrabold text-white shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}
