'use client'

import type { DismissTag } from '@/app/jobs/actions'

interface TagGroup {
  label: string
  tags: { value: DismissTag; label: string }[]
}

const tagGroups: TagGroup[] = [
  {
    label: 'Eligibility',
    tags: [
      { value: 'requires_citizenship', label: 'Requires citizenship' },
      { value: 'requires_clearance', label: 'Requires clearance' },
      { value: 'no_visa_path', label: 'No visa path' },
    ],
  },
  {
    label: 'Fit',
    tags: [
      { value: 'wrong_field', label: 'Wrong field' },
      { value: 'too_junior', label: 'Too junior' },
      { value: 'too_senior', label: 'Too senior' },
      { value: 'salary_too_low', label: 'Salary too low' },
    ],
  },
  {
    label: 'Logistics',
    tags: [
      { value: 'wrong_location', label: 'Wrong location' },
      { value: 'not_remote', label: 'Not remote' },
      { value: 'deadline_expired', label: 'Deadline passed' },
    ],
  },
  {
    label: 'Other',
    tags: [
      { value: 'already_applied', label: 'Already applied' },
    ],
  },
]

interface TagPickerProps {
  onSelect: (tags: DismissTag[]) => void
  onSkip: () => void
}

export function TagPicker({ onSelect, onSkip }: TagPickerProps) {
  return (
    <div className="animate-in fade-in duration-200 pt-3">
      <p className="text-xs text-muted-foreground mb-2">
        Quick note — helps us learn your preferences
      </p>
      <div className="space-y-2">
        {tagGroups.map((group) => (
          <div key={group.label} className="flex flex-wrap gap-1.5">
            {group.tags.map((tag) => (
              <button
                key={tag.value}
                onClick={() => onSelect([tag.value])}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-ocean/30 hover:text-foreground hover:bg-ocean/5 active:scale-95"
              >
                {tag.label}
              </button>
            ))}
          </div>
        ))}
        <button
          onClick={onSkip}
          className="rounded-full px-2.5 py-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
