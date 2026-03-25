/**
 * Seeds the local (or any) Supabase instance with all seed data.
 * Creates auth user → triggers public.users → inserts all data via SDK.
 *
 * Run: bun run src/db/seed-to-supabase.ts
 * Pre-req: supabase start (or target a hosted instance via env vars)
 *
 * Idempotent: safe to run multiple times. Deletes existing seed user
 * and recreates from scratch to avoid partial state.
 */

import { createClient } from '@supabase/supabase-js'
import { seedJobs, seedImmigrationStatus, seedPlans, seedContacts, seedProfile } from './seed'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env var: ${name}. Run with .env.local loaded (bun --env-file=.env.local)`)
  return val
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = requireEnv('SUPABASE_SECRET_KEY')
const ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const TEST_EMAIL = 'dev@skye-search.test'
const TEST_PASSWORD = 'testpass123'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Target: ${SUPABASE_URL}`)

  // ─── Step 1: Create auth user via GoTrue admin API ─────────────────────
  // This triggers handle_new_user() → creates public.users row automatically.

  // Delete existing user first (idempotent reset)
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${TEST_USER_ID}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    }),
  })

  if (!authRes.ok) {
    const err = await authRes.json()
    throw new Error(`Auth user creation failed: ${JSON.stringify(err)}`)
  }
  console.log(`Auth user created: ${TEST_EMAIL}`)

  // ─── Step 2: Update user profile ───────────────────────────────────────

  const { error: profileErr } = await supabase
    .from('users')
    .update({
      profile: seedProfile.profile,
      skills: seedProfile.skills,
      preferences: seedProfile.preferences,
    })
    .eq('id', TEST_USER_ID)

  if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`)
  console.log('Profile updated')

  // ─── Step 3: Immigration status ────────────────────────────────────────

  const { error: immErr } = await supabase
    .from('immigration_status')
    .upsert({
      user_id: TEST_USER_ID,
      visa_type: seedImmigrationStatus.visa_type,
      opt_expiry: seedImmigrationStatus.opt_expiry,
      employment_active: seedImmigrationStatus.employment_active,
      initial_days_used: seedImmigrationStatus.initial_days_used,
      initial_days_source: seedImmigrationStatus.initial_days_source,
      calibration_date: seedImmigrationStatus.calibration_date,
      postdoc_end_date: seedImmigrationStatus.postdoc_end_date,
      niw_status: seedImmigrationStatus.niw_status,
      niw_filing_date: seedImmigrationStatus.niw_filing_date,
      i140_status: seedImmigrationStatus.i140_status,
      i485_status: seedImmigrationStatus.i485_status,
    }, { onConflict: 'user_id' })

  if (immErr) throw new Error(`Immigration status failed: ${immErr.message}`)
  console.log('Immigration status seeded')

  // ─── Step 4: Plans ─────────────────────────────────────────────────────

  for (const plan of seedPlans) {
    const { error } = await supabase
      .from('plans')
      .upsert({
        id: plan.id,
        user_id: TEST_USER_ID,
        status: plan.status,
        next_action: plan.next_action,
        notes: plan.notes,
      }, { onConflict: 'id,user_id' })

    if (error) throw new Error(`Plan ${plan.id} failed: ${error.message}`)
  }
  console.log(`Plans seeded: ${seedPlans.length}`)

  // ─── Step 5: Contacts ──────────────────────────────────────────────────

  // Delete existing contacts first (idempotent)
  await supabase.from('contacts').delete().eq('user_id', TEST_USER_ID)

  for (const contact of seedContacts) {
    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: TEST_USER_ID,
        name: contact.name,
        affiliation: contact.affiliation,
        relationship_type: contact.relationship_type,
        notes: contact.notes,
      })

    if (error) throw new Error(`Contact ${contact.name} failed: ${error.message}`)
  }
  console.log(`Contacts seeded: ${seedContacts.length}`)

  // ─── Step 6: Jobs ──────────────────────────────────────────────────────

  // Delete existing jobs + applications (cascade)
  await supabase.from('applications').delete().eq('user_id', TEST_USER_ID)
  await supabase.from('jobs').delete().eq('user_id', TEST_USER_ID)

  const jobIds: Map<number, string> = new Map()

  for (let i = 0; i < seedJobs.length; i++) {
    const job = seedJobs[i]
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        title: job.title,
        company: job.company,
        company_domain: job.company_domain,
        location: job.location,
        url: job.url,
        visa_path: job.visa_path,
        employer_type: job.employer_type,
        cap_exempt_confidence: job.cap_exempt_confidence,
        employment_type: job.employment_type,
        source_type: job.source_type,
        application_deadline: job.application_deadline,
        deadline_source: job.deadline_source,
        application_complexity: job.application_complexity,
        h1b_sponsor_count: job.h1b_sponsor_count,
        salary: job.salary,
        remote_status: job.remote_status,
        skills_required: job.skills_required,
        why_fits: job.why_fits,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Job "${job.title}" failed: ${error.message}`)
    jobIds.set(i, data.id)
  }
  console.log(`Jobs seeded: ${seedJobs.length}`)

  // ─── Step 7: Pre-applied applications ──────────────────────────────────

  let appCount = 0
  for (let i = 0; i < seedJobs.length; i++) {
    const job = seedJobs[i]
    if (!job.pre_applied) continue

    const jobId = jobIds.get(i)
    if (!jobId) throw new Error(`Missing job ID for index ${i}`)

    const { error } = await supabase
      .from('applications')
      .insert({
        user_id: TEST_USER_ID,
        job_id: jobId,
        kanban_status: 'applied',
        applied_date: job.pre_applied_date ?? '2026-03-24',
      })

    if (error) throw new Error(`Application for "${job.title}" failed: ${error.message}`)
    appCount++
  }
  console.log(`Applications seeded: ${appCount}`)

  // ─── Step 8: Verify login ─────────────────────────────────────────────

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })

  if (loginRes.ok) {
    console.log('Login verified: OK')
  } else {
    console.error('Login verification FAILED:', await loginRes.text())
    process.exit(1)
  }

  // ─── Summary ───────────────────────────────────────────────────────────

  console.log('\nSeed complete:')
  console.log(`  Jobs:          ${seedJobs.length}`)
  console.log(`  Applications:  ${appCount}`)
  console.log(`  Plans:         ${seedPlans.length}`)
  console.log(`  Contacts:      ${seedContacts.length}`)
  console.log(`  Auth user:     ${TEST_EMAIL} / ${TEST_PASSWORD}`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
