'use client'

import { useRef, useState, type FormEvent } from 'react'

type ComposerProps = {
  onSend: (text: string) => void
  onUpload: (file: File) => Promise<void>
  disabled: boolean
  error?: string
}

export function Composer({ onSend, onUpload, disabled, error }: ComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = value.trim()
    if (text.length === 0 || disabled) {
      return
    }
    onSend(text)
    setValue('')
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }
    setUploading(file.name)
    setUploadError(null)
    try {
      await onUpload(file)
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : 'Upload failed. Please try again.'
      )
    } finally {
      setUploading(null)
    }
  }

  const isUploading = uploading !== null

  return (
    <div className="border-t-2 border-ink p-2 md:p-4">
      {(error || uploadError) && (
        <p className="mx-auto mb-2 max-w-3xl text-sm text-red-600">
          {error ?? uploadError}
        </p>
      )}
      <div className="mx-auto max-w-3xl">
        {isUploading && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm shadow-card">
            <span className="size-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            <span className="truncate font-semibold">{uploading}</span>
            <span className="shrink-0 text-xs text-foreground/60">
              Extracting and indexing…
            </span>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-white p-1.5 pl-2 shadow-card md:gap-2"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
            aria-label="Attach a file"
            title="Upload a PDF, TXT, or Markdown"
            className="grid size-9 shrink-0 place-items-center rounded-full text-lg transition-colors hover:bg-zinc-100 disabled:opacity-50"
          >
            📎
          </button>
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask a question about the documents…"
            disabled={disabled}
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-foreground/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || value.trim().length === 0}
            className="shrink-0 rounded-full border-2 border-ink bg-accent px-4 py-2 text-sm font-extrabold text-white transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none md:px-5"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
