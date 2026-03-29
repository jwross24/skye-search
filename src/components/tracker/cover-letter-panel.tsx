'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Pencil, Check, Loader2, RefreshCw, Send, ClipboardCheck } from 'lucide-react'
import {
  generateCoverLetter,
  getCoverLetterStatus,
  saveCoverLetterEdit,
  approveCoverLetter,
  quickApply,
  type CoverLetterState,
} from '@/app/tracker/cover-letter-actions'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoverLetterPanelProps {
  applicationId: string
  companyName: string
  /** Called when Quick Apply moves the card to "Applied" */
  onStatusChange?: (newStatus: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CoverLetterPanel({ applicationId, companyName, onStatusChange }: CoverLetterPanelProps) {
  const [state, setState] = useState<CoverLetterState>({ status: 'none' })
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quickApplying, setQuickApplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Polling helper ────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    const result = await getCoverLetterStatus(applicationId)
    setState(result)

    // If generating, keep polling. Otherwise, stop.
    if (result.status !== 'generating' && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [applicationId])

  // ─── Initial load ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await getCoverLetterStatus(applicationId)
      if (!cancelled) {
        setState(result)
      }
    }
    load()
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [applicationId])

  // ─── Start generation ─────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true)
    const result = await generateCoverLetter(applicationId)

    if (result.success) {
      setState({ status: 'generating', taskId: result.taskId })
      // Clear any existing poll before starting a new one
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(fetchStatus, 3000)
    } else {
      setState({ status: 'error', error: result.error ?? 'Could not start generation.' })
    }
    setGenerating(false)
  }

  // ─── Edit mode ────────────────────────────────────────────────────────

  const startEditing = () => {
    setEditContent(state.document?.contentMd ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!state.document) return
    setSaving(true)
    await saveCoverLetterEdit(state.document.id, editContent)
    setState((prev) => ({
      ...prev,
      document: prev.document ? { ...prev.document, contentMd: editContent } : undefined,
    }))
    setEditing(false)
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditContent('')
  }

  // ─── Approve ──────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!state.document) return
    setApproving(true)
    await approveCoverLetter(state.document.id)
    setState((prev) => ({
      ...prev,
      document: prev.document ? { ...prev.document, status: 'approved' } : undefined,
    }))
    setApproving(false)
  }

  // ─── Quick Apply ──────────────────────────────────────────────────────

  const handleQuickApply = async () => {
    setQuickApplying(true)
    const result = await quickApply(applicationId)
    if (result.success) {
      onStatusChange?.('applied')
    }
    setQuickApplying(false)
  }

  // ─── Retry on error ──────────────────────────────────────────────────

  const handleRetry = () => {
    setState({ status: 'none' })
    handleGenerate()
  }

  // ─── Render ───────────────────────────────────────────────────────────

  // State: no cover letter yet
  if (state.status === 'none') {
    return (
      <div className="px-5 py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-3">Cover Letter</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-ocean/10 text-ocean hover:bg-ocean/20 transition-colors text-sm font-medium disabled:opacity-50"
            data-testid="generate-cover-letter"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {generating ? 'Starting...' : 'Generate Tailored Cover Letter'}
          </button>
          <button
            type="button"
            onClick={handleQuickApply}
            disabled={quickApplying}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs"
            data-testid="quick-apply"
          >
            {quickApplying ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            Apply with Master CV (skip tailoring)
          </button>
        </div>
      </div>
    )
  }

  // State: generating
  if (state.status === 'generating') {
    return (
      <div className="px-5 py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-3">Cover Letter</p>
        <div className="flex items-center gap-3 py-4 px-3 rounded-xl bg-ocean/5 border border-ocean/10">
          <Loader2 className="size-5 text-ocean animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground">
              Tailoring your cover letter for {companyName}...
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This usually takes about 20 seconds
            </p>
          </div>
        </div>
      </div>
    )
  }

  // State: error
  if (state.status === 'error') {
    return (
      <div className="px-5 py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-3">Cover Letter</p>
        <div className="py-3 px-3 rounded-xl bg-amber-warm/5 border border-amber-warm/10">
          <p className="text-sm text-foreground">
            Couldn&apos;t generate this time
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.error ?? 'Something went wrong. Try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 flex items-center gap-1.5 text-xs text-ocean hover:text-ocean-deep"
            data-testid="retry-cover-letter"
          >
            <RefreshCw className="size-3" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  // State: ready (cover letter exists)
  const doc = state.document!
  const isApproved = doc.status === 'approved'

  return (
    <div className="px-5 py-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Cover Letter</p>
          {isApproved && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-jade/10 text-jade">
              Approved
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/50">v{doc.version}</span>
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit cover letter"
              data-testid="edit-cover-letter"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                data-testid="cancel-edit"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="text-xs text-ocean hover:text-ocean-deep px-2 py-1 font-medium"
                data-testid="save-cover-letter"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content — edit or preview */}
      {editing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          aria-label="Edit cover letter"
          className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-2 resize-none focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20 min-h-[240px] leading-relaxed"
          data-testid="cover-letter-editor"
        />
      ) : (
        <div
          className="text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-1"
          data-testid="cover-letter-preview"
        >
          {doc.contentMd}
        </div>
      )}

      {/* Actions */}
      {!editing && !isApproved && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-jade/10 text-jade hover:bg-jade/20 transition-colors text-xs font-medium disabled:opacity-50"
            data-testid="approve-cover-letter"
          >
            {approving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs"
            data-testid="regenerate-cover-letter"
          >
            <RefreshCw className="size-3" />
            Regenerate
          </button>
        </div>
      )}

      {isApproved && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(doc.contentMd)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ocean/10 text-ocean hover:bg-ocean/20 transition-colors text-xs font-medium"
            data-testid="copy-cover-letter"
          >
            {copied ? (
              <ClipboardCheck className="size-3" />
            ) : (
              <FileText className="size-3" />
            )}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  )
}
