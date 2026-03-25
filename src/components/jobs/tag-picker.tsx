'use client'

import type { DismissTag } from '@/app/jobs/actions'

const tagOptions: { value: DismissTag; label: string }[] = [
  { value: 'wrong_field', label: 'Wrong field' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'too_junior', label: 'Too junior' },
  { value: 'too_senior', label: 'Too senior' },
  { value: 'no_visa_path', label: 'No visa path' },
  { value: 'already_applied', label: 'Already applied' },
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
      <div className="flex flex-wrap gap-1.5">
        {tagOptions.map((tag) => (
          <button
            key={tag.value}
            onClick={() => onSelect([tag.value])}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-ocean/30 hover:text-foreground hover:bg-ocean/5 active:scale-95"
          >
            {tag.label}
          </button>
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
