'use client'

import { useState } from 'react'
import { createClient } from '@/db/supabase'
import { CvDropzone } from './cv-dropzone'
import { CvReviewForm } from './cv-review-form'
import { cvExtractionSchema } from '@/types/cv-extraction'
import type { CvExtraction, UserProfile } from '@/types/cv-extraction'
import { FileText, Loader2, CheckCircle2 } from 'lucide-react'

type FlowState =
  | { step: 'idle' }
  | { step: 'extracting'; documentId: string; filePath: string }
  | { step: 'review'; extraction: CvExtraction }
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

      setFlow({ step: 'review', extraction: parsed.data })
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
            {skills.length > 0 && (
              <div>
                <span className="text-muted-foreground">Skills:</span>{' '}
                <span className="font-medium">{skills.length} tracked</span>
              </div>
            )}
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
              </div>
            )}
            <CvDropzone onExtracted={handleUploaded} />
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
            existingSkills={skills}
            existingProfile={profile}
            onSaved={() => setFlow({ step: 'saved' })}
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
