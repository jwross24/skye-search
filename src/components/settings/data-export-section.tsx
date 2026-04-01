'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'

type ExportState = 'idle' | 'downloading' | 'done' | 'error'

export function DataExportSection() {
  const [state, setState] = useState<ExportState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleExport = async () => {
    setState('downloading')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/export')

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1]
        ?? `skye-search-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        Your Data
      </h2>
      <p className="text-sm text-foreground/60 leading-relaxed">
        Download everything — jobs, applications, immigration records, documents,
        contacts, and preferences. It&apos;s your data, always.
      </p>

      <button
        onClick={handleExport}
        disabled={state === 'downloading'}
        className="inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ocean-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:opacity-60 disabled:cursor-wait"
      >
        {state === 'downloading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing your archive…
          </>
        ) : state === 'done' ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download Everything
          </>
        )}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {state === 'error' && errorMsg && (
          <p className="text-sm text-amber-warm">
            {errorMsg}. Try again in a moment.
          </p>
        )}
      </div>
    </section>
  )
}
