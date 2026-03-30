import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AdminDashboard />
}
