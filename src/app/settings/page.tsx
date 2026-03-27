import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { SettingsPageContent } from '@/components/settings/settings-page-content'
import type { UserProfile } from '@/types/cv-extraction'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('profile, skills')
    .eq('id', user.id)
    .single()

  const { data: latestCv } = await supabase
    .from('documents')
    .select('id, file_path, structured_data_json, status, created_at')
    .eq('user_id', user.id)
    .eq('type', 'cv')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="p-6">
      <SettingsPageContent
        profile={(userData?.profile ?? {}) as UserProfile}
        skills={(userData?.skills ?? []) as string[]}
        latestCv={latestCv}
      />
    </div>
  )
}
