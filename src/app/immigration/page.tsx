import { ImmigrationHQ } from '@/components/immigration/immigration-hq'
import { seedImmigrationStatus, seedPlans } from '@/db/seed'

export default function ImmigrationPage() {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Immigration HQ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your compass. Check in anytime.
        </p>
      </div>

      <ImmigrationHQ
        immigrationStatus={seedImmigrationStatus}
        today={today}
        plans={seedPlans}
      />
    </div>
  )
}
