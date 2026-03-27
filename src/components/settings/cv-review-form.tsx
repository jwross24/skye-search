'use client'

import { useState } from 'react'
import { Loader2, X, Plus } from 'lucide-react'
import { saveExtractedProfile } from '@/app/settings/actions'
import type { CvExtraction, UserProfile } from '@/types/cv-extraction'

interface CvReviewFormProps {
  extraction: CvExtraction
  existingSkills: string[]
  existingProfile: UserProfile
  onSaved: () => void
  onDiscard: () => void
}

export function CvReviewForm({
  extraction,
  existingSkills,
  existingProfile,
  onSaved,
  onDiscard,
}: CvReviewFormProps) {
  const [skills, setSkills] = useState<string[]>(() => {
    // Union existing + extracted, dedup case-insensitive
    const existing = new Set(existingSkills.map(s => s.toLowerCase()))
    const combined = [...existingSkills]
    for (const s of extraction.skills) {
      if (!existing.has(s.toLowerCase())) {
        combined.push(s)
        existing.add(s.toLowerCase())
      }
    }
    return combined
  })
  const [newSkill, setNewSkill] = useState('')
  const [name, setName] = useState(
    extraction.name ?? existingProfile.name ?? '',
  )
  const [field, setField] = useState(
    extraction.field ?? existingProfile.field ?? '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const result = await saveExtractedProfile({
      name,
      field,
      skills,
      research_areas: extraction.research_areas,
      publications: extraction.publications,
      education: extraction.education,
      employment_history: extraction.employment_history,
    })

    setSaving(false)
    if (result.success) {
      onSaved()
    } else {
      setError(result.error ?? 'Failed to save')
    }
  }

  const removeSkill = (index: number) => {
    setSkills(prev => prev.filter((_, i) => i !== index))
  }

  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (trimmed && !skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills(prev => [...prev, trimmed])
      setNewSkill('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          We found these details in your CV. Take a look and make any changes
          before saving.
        </p>
      </div>

      {/* Name + Field */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cv-name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="cv-name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-colors focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
          />
        </div>
        <div>
          <label htmlFor="cv-field" className="block text-sm font-medium text-foreground">
            Field
          </label>
          <input
            id="cv-field"
            value={field}
            onChange={e => setField(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-colors focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
          />
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          Skills ({skills.length})
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map((skill, i) => (
            <span
              key={`${skill}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-ocean/8 px-2.5 py-1 text-xs text-ocean"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(i)}
                className="rounded-full p-0.5 hover:bg-ocean/15"
                aria-label={`Remove ${skill}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Add a skill..."
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Research Areas */}
      {extraction.research_areas.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground">
            Research Areas
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {extraction.research_areas.map((area, i) => (
              <span
                key={`${area}-${i}`}
                className="rounded-full bg-jade/8 px-2.5 py-1 text-xs text-jade"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {extraction.education.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground">
            Education ({extraction.education.length})
          </label>
          <div className="mt-2 space-y-2">
            {extraction.education.map((edu, i) => (
              <div key={i} className="rounded-xl border border-border/50 px-4 py-3">
                <p className="text-sm font-medium">{edu.degree} in {edu.field}</p>
                <p className="text-xs text-muted-foreground">
                  {edu.institution}{edu.year ? ` (${edu.year})` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications */}
      {extraction.publications.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground">
            Publications ({extraction.publications.length})
          </label>
          <div className="mt-2 space-y-2">
            {extraction.publications.map((pub, i) => (
              <div key={i} className="rounded-xl border border-border/50 px-4 py-3">
                <p className="text-sm font-medium">{pub.title}</p>
                <p className="text-xs text-muted-foreground">{pub.authors}</p>
                {pub.venue && (
                  <p className="text-xs italic text-muted-foreground/70">{pub.venue}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employment */}
      {extraction.employment_history.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground">
            Employment ({extraction.employment_history.length})
          </label>
          <div className="mt-2 space-y-2">
            {extraction.employment_history.map((job, i) => (
              <div key={i} className="rounded-xl border border-border/50 px-4 py-3">
                <p className="text-sm font-medium">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.organization}</p>
                {(job.start_date || job.end_date) && (
                  <p className="text-xs text-muted-foreground/70">
                    {job.start_date ?? '?'} — {job.end_date ?? 'present'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {error && (
        <p className="text-sm text-amber-warm" role="alert">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-ocean-deep px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ocean-deep/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save to profile
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
