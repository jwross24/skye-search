'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'
import { enqueueTask } from '@/lib/task-queue'

// ─── Generate Cover Letter ──────────────────────────────────────────────────

export async function generateCoverLetter(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Idempotency: check for pending/processing task for this specific application
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('task_queue')
    .select('id, status, payload_json')
    .eq('user_id', user.id)
    .eq('task_type', 'tailor_cover_letter')
    .in('status', ['pending', 'processing'])
    .gte('created_at', fiveMinutesAgo)

  // Only skip if there's already a task for THIS application (not a different job)
  const duplicateForThisApp = existing?.find(
    (t) => (t.payload_json as Record<string, unknown>)?.application_id === applicationId,
  )
  if (duplicateForThisApp) {
    return { success: true, skipped: true, taskId: duplicateForThisApp.id }
  }

  const result = await enqueueTask({
    userId: user.id,
    taskType: 'tailor_cover_letter',
    payload: { application_id: applicationId },
    maxRetries: 2,
  })

  revalidatePath('/tracker')
  return { success: true, skipped: false, taskId: result.taskId }
}

// ─── Poll Cover Letter Status ───────────────────────────────────────────────

export interface CoverLetterState {
  status: 'none' | 'generating' | 'ready' | 'error'
  document?: {
    id: string
    contentMd: string
    version: number
    status: string
    createdAt: string
  }
  error?: string
  taskId?: string
}

export async function getCoverLetterStatus(applicationId: string): Promise<CoverLetterState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'none' }

  // First check for existing cover letter documents linked to this application's job
  const { data: app } = await supabase
    .from('applications')
    .select('id, documents_used, jobs(id)')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single()

  if (!app) return { status: 'none' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobId = (app.jobs as any)?.id

  // Check for existing cover letter document for this job
  if (jobId) {
    const { data: doc } = await supabase
      .from('documents')
      .select('id, content_md, version, status, created_at')
      .eq('user_id', user.id)
      .eq('type', 'cover_letter')
      .eq('parent_job_id', jobId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (doc) {
      return {
        status: 'ready',
        document: {
          id: doc.id,
          contentMd: doc.content_md ?? '',
          version: doc.version ?? 1,
          status: doc.status ?? 'pending_review',
          createdAt: doc.created_at,
        },
      }
    }
  }

  // Check for in-flight generation task
  const { data: tasks } = await supabase
    .from('task_queue')
    .select('id, status, error_log, result_json')
    .eq('user_id', user.id)
    .eq('task_type', 'tailor_cover_letter')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!tasks || tasks.length === 0) return { status: 'none' }

  const task = tasks[0]

  if (task.status === 'pending' || task.status === 'processing') {
    return { status: 'generating', taskId: task.id }
  }

  if (task.status === 'completed' && task.result_json) {
    // Task completed but document not found — race condition, refetch
    const resultData = task.result_json as { document_id?: string }
    if (resultData.document_id) {
      const { data: doc } = await supabase
        .from('documents')
        .select('id, content_md, version, status, created_at')
        .eq('id', resultData.document_id)
        .single()

      if (doc) {
        return {
          status: 'ready',
          document: {
            id: doc.id,
            contentMd: doc.content_md ?? '',
            version: doc.version ?? 1,
            status: doc.status ?? 'pending_review',
            createdAt: doc.created_at,
          },
        }
      }
    }
  }

  if (task.status === 'failed_retry' || task.status === 'failed_validation') {
    return { status: 'error', error: task.error_log ?? 'Generation failed', taskId: task.id }
  }

  return { status: 'none' }
}

// ─── Save Cover Letter Edits ────────────────────────────────────────────────

export async function saveCoverLetterEdit(documentId: string, contentMd: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('documents')
    .update({ content_md: contentMd, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Approve Cover Letter ───────────────────────────────────────────────────

export async function approveCoverLetter(documentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Update status to approved
  const { error } = await supabase
    .from('documents')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracker')
  return { success: true }
}

// ─── Quick Apply (skip tailoring, move to Applied with master CV) ───────────

export async function quickApply(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get master CV document ID
  const { data: masterCv } = await supabase
    .from('documents')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'cv')
    .eq('is_master', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Move to applied status, attach master CV if available
  const { error } = await supabase
    .from('applications')
    .update({
      kanban_status: 'applied',
      applied_date: new Date().toISOString().split('T')[0],
      ...(masterCv ? { documents_used: [masterCv.id] } : {}),
    })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracker')
  return { success: true }
}
