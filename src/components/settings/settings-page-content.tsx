'use client'

import { useState } from 'react'
import { createClient } from '@/db/supabase'
import { CvDropzone } from './cv-dropzone'
import { CvReviewForm } from './cv-review-form'
import { cvExtractionSchema } from '@/types/cv-extraction'
import type { CvExtraction, UserProfile } from '@/types/cv-extraction'
import { FileText, Loader2, CheckCircle2, X, Plus } from 'lucide-react'
import { addSkill, removeSkill } from '@/app/settings/actions'

type FlowState =
  | { step: 'idle' }
  | { step: 'extracting'; documentId: string; filePath: string }
  | { step: 'review'; extraction: CvExtraction; documentId: string }
  | { step: 'saved' }
  | { step: 'error'; message: string }

interface SettingsPageContentProps {
  profile: UserProfile
  skills: string[]
  latestCv: {
    id: string
    file_path: string | null
    structured_data_json: unknown
    status: string | null
    created_at: string
  } | null
}

export function SettingsPageContent({
  profile,
  skills,
  latestCv,
}: SettingsPageContentProps) {
  const [flow, setFlow] = useState<FlowState>({ step: 'idle' })
  const [showReupload, setShowReupload] = useState(false)
  const [localSkills, setLocalSkills] = useState<string[]>(skills)
  const [newSkill, setNewSkill] = useState('')
  const [skillError, setSkillError] = useState<string | null>(null)

  const handleAddSkill = async () => {
    const trimmed = newSkill.trim()
    if (!trimmed) return

    if (localSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillError('Already tracked')
      return
    }

    // Optimistic update
    setLocalSkills(prev => [...prev, trimmed])
    setNewSkill('')
    setSkillError(null)

    const result = await addSkill(trimmed)
    if (!result.success) {
      setLocalSkills(prev => prev.filter(s => s !== trimmed))
      setSkillError(result.error ?? 'Failed to add skill')
    }
  }

  const handleRemoveSkill = async (skill: string) => {
    // Optimistic update
    setLocalSkills(prev => prev.filter(s => s !== skill))

    const result = await removeSkill(skill)
    if (!result.success) {
      setLocalSkills(prev => [...prev, skill])
      setSkillError(result.error ?? 'Failed to remove skill')
    }
  }

  const handleUploaded = async (data: { documentId: string; filePath: string }) => {
    setFlow({ step: 'extracting', ...data })

    try {
      const supabase = createClient()
      const { data: result, error } = await supabase.functions.invoke('extract-cv', {
        body: { documentId: data.documentId, filePath: data.filePath },
      })

      if (error) {
        setFlow({ step: 'error', message: error.message ?? 'Extraction failed' })
        return
      }

      if (!result?.ok || !result?.extraction) {
        setFlow({ step: 'error', message: result?.error ?? 'No extraction data returned' })
        return
      }

      // Validate with Zod
      const parsed = cvExtractionSchema.safeParse(result.extraction)
      if (!parsed.success) {
        console.error('Extraction validation failed:', parsed.error)
        setFlow({
          step: 'error',
          message: "We couldn't parse your CV automatically. You can enter details manually in your profile.",
        })
        return
      }

      setFlow({ step: 'review', extraction: parsed.data, documentId: data.documentId })
    } catch (err) {
      setFlow({
        step: 'error',
        message: err instanceof Error ? err.message : 'Extraction failed',
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload your CV to enrich your profile with skills, publications, and experience.
        </p>
      </div>

      {/* Current profile summary */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your profile
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="grid gap-3 text-sm">
            {profile.name && (
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{String(profile.name)}</span>
              </div>
            )}
            {profile.field && (
              <div>
                <span className="text-muted-foreground">Field:</span>{' '}
                <span className="font-medium">{String(profile.field)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Skills:</span>{' '}
              <span className="font-medium">{localSkills.length} tracked</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {localSkills.map((skill) => (
                  <span
                    key={skill}
                    className="group inline-flex items-center gap-1 rounded-full bg-ocean/8 px-2.5 py-0.5 text-xs text-ocean"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-ocean/15 p-0.5"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => {
                    setNewSkill(e.target.value)
                    setSkillError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                  placeholder="Add a skill..."
                  className="rounded-xl border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!newSkill.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-ocean/10 px-3 py-1.5 text-sm text-ocean hover:bg-ocean/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>
              {skillError && (
                <p className="mt-1.5 text-xs text-amber-warm">{skillError}</p>
              )}
              {localSkills.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Add skills that matter for your job search
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CV Upload section */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your documents
        </h2>

        {flow.step === 'idle' && (
          <>
            {latestCv && (
              <div className="flex items-center gap-2 rounded-xl bg-ocean/8 px-4 py-3 text-sm text-ocean">
                <FileText className="size-4" />
                CV uploaded on {new Date(latestCv.created_at).toLocaleDateString()}
                {latestCv.status === 'pending_review' && ' — review pending'}
                {latestCv.status === 'approved' && ' — profile updated'}
              </div>
            )}
            {(latestCv?.status !== 'approved' || showReupload) && (
              <CvDropzone onExtracted={handleUploaded} />
            )}
            {latestCv?.status === 'approved' && !showReupload && (
              <button
                type="button"
                onClick={() => setShowReupload(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Upload a new CV
              </button>
            )}
          </>
        )}

        {flow.step === 'extracting' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-12">
            <Loader2 className="size-8 animate-spin text-ocean" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Reading your CV...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Extracting skills, publications, and experience. This usually takes about 15 seconds.
              </p>
            </div>
          </div>
        )}

        {flow.step === 'review' && (
          <CvReviewForm
            extraction={flow.extraction}
            existingSkills={localSkills}
            existingProfile={profile}
            documentId={flow.documentId}
            onSaved={() => {
              // Merge extracted skills into localSkills (revalidatePath won't update useState)
              if (flow.step === 'review') {
                const existingLower = new Set(localSkills.map(s => s.toLowerCase()))
                const newSkills = flow.extraction.skills.filter(
                  s => !existingLower.has(s.toLowerCase()),
                )
                setLocalSkills(prev => [...prev, ...newSkills])
              }
              setFlow({ step: 'saved' })
            }}
            onDiscard={() => setFlow({ step: 'idle' })}
          />
        )}

        {flow.step === 'saved' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-jade/20 bg-jade/5 px-6 py-10">
            <CheckCircle2 className="size-8 text-jade" />
            <p className="text-sm font-medium text-foreground">Profile updated</p>
            <p className="text-xs text-muted-foreground">
              Your skills and experience have been saved.
            </p>
            <button
              type="button"
              onClick={() => setFlow({ step: 'idle' })}
              className="mt-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              Upload another CV
            </button>
          </div>
        )}

        {flow.step === 'error' && (
          <div className="rounded-2xl border border-amber-warm/20 bg-amber-warm/5 px-6 py-6 text-center">
            <p className="text-sm text-amber-warm">{flow.message}</p>
            <button
              type="button"
              onClick={() => setFlow({ step: 'idle' })}
              className="mt-3 rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              Try again
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
