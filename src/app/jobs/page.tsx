import { redirect } from 'next/navigation'
import { DailyBatch } from '@/components/jobs/daily-batch'
import { createClient } from '@/db/supabase-server'
import type { UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // ─── Parallel queries ────────────────────────────────────────────────

  const [jobsResult, votesResult, appsResult, immResult] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', user.id),
    supabase.from('votes').select('job_id').eq('user_id', user.id),
    supabase.from('applications').select('job_id').eq('user_id', user.id),
    supabase
      .from('immigration_status')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  // ─── Filter out already-voted / already-applied jobs ─────────────────

  const votedJobIds = new Set<string>([
    ...(votesResult.data ?? []).map((v) => v.job_id),
    ...(appsResult.data ?? [])
      .map((a) => a.job_id)
      .filter((id): id is string => id !== null),
  ])

  // ─── Map DB rows → Job type ──────────────────────────────────────────

  const jobs: Job[] = (jobsResult.data ?? [])
    .filter((row) => !votedJobIds.has(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title ?? '',
      company: row.company ?? '',
      company_domain: row.company_domain,
      location: row.location ?? '',
      url: row.url,
      visa_path: (row.visa_path ?? 'unknown') as Job['visa_path'],
      employer_type: (row.employer_type ?? 'unknown') as Job['employer_type'],
      cap_exempt_confidence: (row.cap_exempt_confidence ?? 'none') as Job['cap_exempt_confidence'],
      employment_type: (row.employment_type ?? 'unknown') as Job['employment_type'],
      source_type: row.source_type as Job['source_type'],
      application_deadline: row.application_deadline,
      deadline_source: row.deadline_source,
      application_complexity: row.application_complexity,
      h1b_sponsor_count: row.h1b_sponsor_count,
      salary: row.salary,
      remote_status: row.remote_status,
      skills_required: row.skills_required ?? [],
      why_fits: row.why_fits ?? '',
      indexed_date: row.indexed_date,
    }))

  // ─── Compute user state from immigration_status ──────────────────────

  const immRow = immResult.data

  const userState: UserState = immRow
    ? {
        days_remaining: 150 - (immRow.initial_days_used ?? 0),
        is_employed: immRow.employment_active,
        offer_accepted_not_started: false,
        employment_end_date: immRow.postdoc_end_date ?? null,
        in_grace_period: false,
        today,
      }
    : {
        days_remaining: 150,
        is_employed: false,
        offer_accepted_not_started: false,
        employment_end_date: null,
        in_grace_period: false,
        today,
      }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Today&apos;s Picks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles matched to your immigration timeline. Take your time.
        </p>
      </div>

      <DailyBatch jobs={jobs} userState={userState} />
    </div>
  )
}
