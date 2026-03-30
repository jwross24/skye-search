import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/db/supabase-server'
import { computeAllScenarios, type ImmigrationState } from '@/lib/what-if-scenarios'
import { WhatIfScenarios } from '@/components/immigration/what-if-scenarios'

export default async function WhatIfPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch current immigration state
  const { data: imm } = await supabase
    .from('immigration_status')
    .select('initial_days_used, postdoc_end_date, opt_expiry, employment_active')
    .eq('user_id', user.id)
    .single()

  // Get accurate days from immigration_clock view
  const { data: clock } = await supabase
    .from('immigration_clock')
    .select('days_remaining')
    .eq('user_id', user.id)
    .maybeSingle()

  const daysUsed = clock?.days_remaining != null
    ? 150 - clock.days_remaining
    : imm?.initial_days_used ?? 0

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  let scenarios: ReturnType<typeof computeAllScenarios> = []
  if (imm?.postdoc_end_date && imm?.opt_expiry) {
    const state: ImmigrationState = {
      daysUsed,
      postdocEndDate: imm.postdoc_end_date,
      optExpiry: imm.opt_expiry,
      employmentActive: imm.employment_active ?? false,
      today,
    }
    scenarios = computeAllScenarios(state)
  }

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/immigration"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="size-3" />
          Immigration HQ
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          What if...
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s look at your options
        </p>
      </div>

      <div className="max-w-xl">
        <WhatIfScenarios scenarios={scenarios} daysUsed={daysUsed} />
      </div>
    </div>
  )
}
