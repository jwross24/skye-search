'use server'

import { createClient } from '@/db/supabase-server'

// Not exported: 'use server' files may only export async functions
interface TemplateData {
  postdocEndDate: string | null
  employer: string | null
  daysUsed: number
  optExpiry: string | null
  dsoName: string
  fullName: string
  employmentActive: boolean
  planCActive: boolean
  offerAccepted: boolean
  hrContact: string
}

export async function getEmailTemplateData(): Promise<TemplateData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch immigration status
  const { data: immRow } = await supabase
    .from('immigration_status')
    .select('postdoc_end_date, opt_expiry, employment_active, initial_days_used')
    .eq('user_id', user.id)
    .single()

  // Fetch immigration clock for accurate days_used
  const { data: clockRow } = await supabase
    .from('immigration_clock')
    .select('days_remaining')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch user profile for name and DSO info
  const { data: userRow } = await supabase
    .from('users')
    .select('profile')
    .eq('id', user.id)
    .single()

  // Fetch plans to detect active Plan C (CPT)
  const { data: planRows } = await supabase
    .from('plans')
    .select('id, status')
    .eq('user_id', user.id)

  // Fetch applications for offer_accepted at cap-exempt employer
  const { data: appRows } = await supabase
    .from('applications')
    .select('kanban_status, job_id')
    .eq('user_id', user.id)
    .eq('kanban_status', 'offer_accepted')

  // Determine if any offer_accepted apps have cap-exempt jobs
  let offerAccepted = false
  if (appRows && appRows.length > 0) {
    const jobIds = appRows.map((a) => a.job_id).filter(Boolean)
    if (jobIds.length > 0) {
      const { data: jobRows } = await supabase
        .from('jobs')
        .select('id, visa_path')
        .in('id', jobIds)
        .eq('visa_path', 'cap_exempt')
      offerAccepted = (jobRows?.length ?? 0) > 0
    }
  }

  // Resolve profile fields
  const profile = userRow?.profile as Record<string, string> | null ?? {}
  const fullName: string = profile.full_name
    ?? user.email?.split('@')[0]
    ?? '[Your full name]'
  const dsoName: string = profile.dso_name ?? '[Your DSO\'s name]'

  // Calculate days used: prefer clock view (conservative), fall back to initial_days_used
  const daysRemaining = clockRow?.days_remaining ?? null
  const daysUsed = daysRemaining !== null
    ? 150 - daysRemaining
    : (immRow?.initial_days_used ?? 0)

  // Plan C: plan with id 'plan_c' (CPT) that has active status
  const planCActive = (planRows ?? []).some(
    (p) => p.id === 'plan_c' && p.status === 'active',
  )

  // Derive employer name from immigration_ledger (the most recent employed entry)
  // Falls back to immigration_status employment_start context, then a placeholder
  const { data: ledgerRow } = await supabase
    .from('immigration_ledger')
    .select('employer_name')
    .eq('user_id', user.id)
    .eq('status_type', 'employed')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const employer: string = ledgerRow?.employer_name ?? '[Employer]'

  return {
    postdocEndDate: immRow?.postdoc_end_date ?? null,
    employer,
    daysUsed,
    optExpiry: immRow?.opt_expiry ?? null,
    dsoName,
    fullName,
    employmentActive: immRow?.employment_active ?? false,
    planCActive,
    offerAccepted,
    hrContact: '[HR Contact]',
  }
}
