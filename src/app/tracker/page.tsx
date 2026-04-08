import { redirect } from 'next/navigation'
import { KanbanBoard, type TrackedApplication, type KanbanStatus } from '@/components/tracker/kanban-board'
import { createClient } from '@/db/supabase-server'
import type { SeedJob } from '@/db/seed'

export default async function TrackerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ─── Query applications with joined job data ──────────────────────────

  const { data: rows } = await supabase
    .from('applications')
    .select(`
      id,
      kanban_status,
      notes,
      next_action,
      next_action_date,
      contacts,
      applied_date,
      phone_screen_date,
      interview_date,
      snoozed_until,
      rejection_type,
      created_at,
      jobs (
        title,
        company,
        company_domain,
        location,
        url,
        visa_path,
        employer_type,
        cap_exempt_confidence,
        employment_type,
        source_type,
        application_deadline,
        deadline_source,
        application_complexity,
        h1b_sponsor_count,
        salary,
        remote_status,
        skills_required,
        why_fits
      )
    `)
    .eq('user_id', user.id)
    .neq('kanban_status', 'withdrawn')
    .order('created_at', { ascending: false })

  // ─── Map DB rows to TrackedApplication[] ───────────────────────────────

  const applications: TrackedApplication[] = (rows ?? [])
    .filter((row) => row.jobs) // skip orphaned applications
    .map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const j = row.jobs as any
      const job: SeedJob = {
        title: j.title ?? '',
        company: j.company ?? '',
        company_domain: j.company_domain ?? null,
        location: j.location ?? '',
        url: j.url ?? null,
        visa_path: j.visa_path ?? 'unknown',
        employer_type: j.employer_type ?? 'unknown',
        cap_exempt_confidence: j.cap_exempt_confidence ?? 'none',
        employment_type: j.employment_type ?? 'unknown',
        source_type: j.source_type ?? 'academic',
        application_deadline: j.application_deadline ?? null,
        deadline_source: j.deadline_source ?? null,
        application_complexity: j.application_complexity ?? null,
        h1b_sponsor_count: j.h1b_sponsor_count ?? null,
        salary: j.salary ?? null,
        remote_status: j.remote_status ?? null,
        skills_required: j.skills_required ?? [],
        why_fits: j.why_fits ?? '',
      }

      return {
        id: row.id,
        job,
        status: row.kanban_status as KanbanStatus,
        dateAdded: row.applied_date ?? row.created_at?.split('T')[0] ?? '',
        notes: row.notes ?? '',
        nextAction: row.next_action ?? '',
        nextActionDate: row.next_action_date ?? '',
        contacts: (row.contacts as { name: string; email: string; role: string }[]) ?? [],
        rejectionType: row.rejection_type as TrackedApplication['rejectionType'],
        appliedDate: row.applied_date ?? undefined,
        phoneScreenDate: row.phone_screen_date ?? undefined,
        interviewDate: row.interview_date ?? undefined,
        snoozedUntil: row.snoozed_until ?? undefined,
      }
    })

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Application Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your pipeline at a glance
        </p>
      </div>

      <KanbanBoard initialApplications={applications} />
    </div>
  )
}
