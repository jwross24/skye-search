import { redirect } from 'next/navigation'
import { ImmigrationHQ } from '@/components/immigration/immigration-hq'
import { createClient } from '@/db/supabase-server'
import type { SeedImmigrationStatus, SeedPlan } from '@/db/seed'

export default async function ImmigrationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // ─── Query immigration status ──────────────────────────────────────────

  const { data: immRow } = await supabase
    .from('immigration_status')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // ─── Query plans ───────────────────────────────────────────────────────

  const { data: planRows } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', user.id)
    .order('id')

  // ─── Query last cron run ───────────────────────────────────────────────

  const { data: lastCron } = await supabase
    .from('cron_execution_log')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('execution_date', { ascending: false })
    .limit(1)
    .single()

  // ─── Query disclaimer status ───────────────────────────────────────────

  const { data: userRow } = await supabase
    .from('users')
    .select('disclaimer_acknowledged_at')
    .eq('id', user.id)
    .single()

  // ─── Map DB rows to component props ────────────────────────────────────
  // Keep existing component interface to minimize changes downstream.

  const immigrationStatus: SeedImmigrationStatus | null = immRow
    ? {
        visa_type: immRow.visa_type ?? 'F-1 STEM OPT',
        opt_expiry: immRow.opt_expiry ?? '',
        employment_active: immRow.employment_active,
        initial_days_used: immRow.initial_days_used,
        initial_days_source: immRow.initial_days_source as 'dso_confirmed' | 'user_reported',
        calibration_date: immRow.calibration_date ?? '',
        postdoc_end_date: immRow.postdoc_end_date ?? '',
        niw_status: immRow.niw_status ?? '',
        niw_filing_date: immRow.niw_filing_date ?? null,
        i140_status: immRow.i140_status as 'not_filed' | 'filed' | 'approved' | 'denied',
        i485_status: immRow.i485_status as 'not_filed' | 'filed' | 'approved' | 'denied',
      }
    : null

  const plans: SeedPlan[] = (planRows ?? []).map((p) => ({
    id: p.id as SeedPlan['id'],
    status: p.status as SeedPlan['status'],
    next_action: p.next_action,
    notes: p.notes,
  }))

  const lastCronRun = lastCron?.completed_at ?? null
  const disclaimerAcked = !!userRow?.disclaimer_acknowledged_at

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
        immigrationStatus={immigrationStatus}
        today={today}
        plans={plans}
        lastCronRun={lastCronRun}
        disclaimerAcked={disclaimerAcked}
      />
    </div>
  )
}
