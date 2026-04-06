import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { PlanCContent } from '@/components/immigration/plan-c-content'

export default async function PlanCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: immStatus } = await supabase
    .from('immigration_status')
    .select('employment_active')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/immigration"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3" />
          Immigration HQ
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Plan C: Day 1 CPT
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A safety net, not a first choice. Research programs here so you&apos;re ready if needed.
        </p>
      </div>

      <PlanCContent
        employmentActive={immStatus?.employment_active ?? false}
      />
    </div>
  )
}
