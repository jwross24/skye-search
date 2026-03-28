import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { SettingsPageContent } from '@/components/settings/settings-page-content'
import { BudgetSection } from '@/components/settings/budget-section'
import type { UserProfile } from '@/types/cv-extraction'
import { DEFAULT_CAPS } from '@/lib/budget-guard'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const [userData, latestCv, dailySpend, weeklySpend] = await Promise.all([
    supabase
      .from('users')
      .select('profile, skills, user_preferences')
      .eq('id', user.id)
      .single(),
    supabase
      .from('documents')
      .select('id, file_path, structured_data_json, status, created_at')
      .eq('user_id', user.id)
      .eq('type', 'cv')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('daily_spend')
      .select('total_cents')
      .eq('user_id', user.id)
      .eq('spend_date', today)
      .maybeSingle(),
    supabase
      .from('weekly_spend')
      .select('total_cents')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const budgetCaps = (userData.data?.user_preferences as Record<string, unknown> | null)?.budget as {
    daily_cap_cents: number
    weekly_soft_cap_cents: number
    weekly_alert_threshold_cents: number
  } | undefined

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <SettingsPageContent
          profile={(userData.data?.profile ?? {}) as UserProfile}
          skills={(userData.data?.skills ?? []) as string[]}
          latestCv={latestCv.data}
        />
        <BudgetSection
          dailyCents={dailySpend.data?.total_cents ?? 0}
          weeklyCents={weeklySpend.data?.total_cents ?? 0}
          dailyCapCents={budgetCaps?.daily_cap_cents ?? DEFAULT_CAPS.daily_cap_cents}
          weeklyCapCents={budgetCaps?.weekly_soft_cap_cents ?? DEFAULT_CAPS.weekly_soft_cap_cents}
          weeklyAlertCents={budgetCaps?.weekly_alert_threshold_cents ?? DEFAULT_CAPS.weekly_alert_threshold_cents}
        />
      </div>
    </div>
  )
}
