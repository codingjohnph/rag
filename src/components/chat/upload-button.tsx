'use client'

import { useRef, useState } from 'react'

type UploadButtonProps = {
  onUpload: (file: File) => Promise<void>
  label?: string
  large?: boolean
}

export function UploadButton({
  onUpload,
  label = '+ Upload',
  large
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }
    setUploading(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (uploadFailure) {
      setError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : 'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="shrink-0">
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
        disabled={uploading}
        className={
          large
            ? 'rounded-full border-2 border-ink bg-accent px-8 py-3.5 text-sm font-extrabold text-white shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-60'
            : 'rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-extrabold text-white shadow-card transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-60'
        }
      >
        {uploading ? 'Uploading…' : label}
      </button>
      {error && <p className="mt-1 max-w-52 text-xs text-red-600">{error}</p>}
    </div>
  )
}
