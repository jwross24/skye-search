'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddJobForm } from './add-job-form'

export function JobsHeader() {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Today&apos;s Picks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Roles matched to your immigration timeline. Take your time.
          </p>
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            Add job
          </Button>
        )}
      </div>
      {showForm && (
        <AddJobForm
          onClose={() => setShowForm(false)}
          onAdded={() => router.refresh()}
        />
      )}
    </div>
  )
}
