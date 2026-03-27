'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { uploadCv } from '@/app/settings/actions'

type UploadState = 'idle' | 'uploading' | 'extracting' | 'error'

interface CvDropzoneProps {
  onExtracted: (data: { documentId: string; filePath: string }) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function CvDropzone({ onExtracted }: CvDropzoneProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF and DOCX files are accepted')
      return
    }

    setError(null)
    setFileName(file.name)
    setState('uploading')

    const formData = new FormData()
    formData.append('cv', file)

    const result = await uploadCv(formData)

    if (!result.success) {
      setState('error')
      setError(result.error ?? 'Upload failed')
      return
    }

    setState('idle')
    onExtracted({ documentId: result.documentId!, filePath: result.filePath! })
  }, [onExtracted])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleClick = useCallback(() => inputRef.current?.click(), [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const isUploading = state === 'uploading'

  return (
    <div className="space-y-3">
      {/* Guardrail warning */}
      <div className="flex gap-2.5 rounded-xl bg-amber-warm/8 px-4 py-3 text-sm text-amber-warm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          Heads up — your CV may contain personal info like addresses or phone
          numbers. We store it encrypted, but you can always delete it from
          Settings.
        </p>
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isUploading}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          isDragOver
            ? 'border-ocean bg-ocean/5'
            : 'border-border hover:border-ocean/40 hover:bg-ocean/3'
        } ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
      >
        {isUploading ? (
          <Loader2 className="size-8 animate-spin text-ocean" />
        ) : (
          <Upload className="size-8 text-muted-foreground/50" />
        )}

        {isUploading ? (
          <p className="text-sm text-muted-foreground">
            Uploading {fileName}...
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              Drop your CV here to get started
            </p>
            <p className="text-xs text-muted-foreground">
              PDF or DOCX, up to 10MB
            </p>
          </>
        )}

        {fileName && !isUploading && !error && (
          <div className="flex items-center gap-2 rounded-lg bg-ocean/8 px-3 py-1.5 text-xs text-ocean">
            <FileText className="size-3.5" />
            {fileName}
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload CV"
      />

      {error && (
        <p className="text-sm text-amber-warm" role="alert">{error}</p>
      )}
    </div>
  )
}
