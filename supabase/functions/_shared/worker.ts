import type { TaskQueueDb, TaskRow, WorkerResult } from './task-types.ts'
import { getHandler } from './handler-registry.ts'
import { computeNextRetryAt } from './backoff.ts'
import { getSupabaseAdmin } from './supabase-admin.ts'

export async function processTaskBatch(
  db: TaskQueueDb,
  batchSize = 10,
): Promise<WorkerResult> {
  const result: WorkerResult = {
    processed: 0,
    completed: 0,
    retried: 0,
    deadLettered: 0,
    failed: 0,
    errors: [],
  }

  const tasks = await db.dequeueTasks(batchSize)
  if (tasks.length === 0) return result

  for (const task of tasks) {
    result.processed++
    await processOneTask(db, task, result)
  }

  return result
}

async function processOneTask(
  db: TaskQueueDb,
  task: TaskRow,
  result: WorkerResult,
): Promise<void> {
  const handler = getHandler(task.task_type)

  if (!handler) {
    result.failed++
    result.errors.push({
      taskId: task.id,
      taskType: task.task_type,
      error: `No handler registered for task_type: ${task.task_type}`,
    })
    await db.failValidation(task.id, `No handler registered for task_type: ${task.task_type}`)
    return
  }

  try {
    const taskResult = await handler.execute(task)

    if (taskResult.success) {
      await db.completeTask(task.id, taskResult.data ?? {})
      result.completed++
    } else if (taskResult.permanent) {
      await db.failValidation(task.id, taskResult.error ?? 'Permanent failure')
      result.failed++
      result.errors.push({
        taskId: task.id,
        taskType: task.task_type,
        error: taskResult.error ?? 'Permanent failure',
      })
      await persistError(task, taskResult.error ?? 'Permanent failure', 'validation_failed')
    } else {
      await handleRetryOrDeadLetter(db, task, taskResult.error ?? 'Task failed', result)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await handleRetryOrDeadLetter(db, task, errorMsg, result)
  }
}

async function handleRetryOrDeadLetter(
  db: TaskQueueDb,
  task: TaskRow,
  errorMsg: string,
  result: WorkerResult,
): Promise<void> {
  // retry_count reflects previous retries. The retry_task RPC increments it atomically.
  // After this RPC call, the DB will have retry_count = task.retry_count + 1.
  const nextRetryCount = task.retry_count + 1

  if (nextRetryCount >= task.max_retries) {
    await db.deadLetterTask(task.id, errorMsg)
    result.deadLettered++
    result.errors.push({ taskId: task.id, taskType: task.task_type, error: errorMsg })
    await persistError(task, errorMsg, 'dead_lettered')
  } else {
    // Use nextRetryCount for backoff: matches the post-increment DB state
    const nextRetryAt = computeNextRetryAt(nextRetryCount)
    await db.retryTask(task.id, errorMsg, nextRetryAt)
    result.retried++
  }
}

async function persistError(task: TaskRow, errorMsg: string, errorType: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('api_usage_log').insert({
      user_id: task.user_id,
      model: `error:${errorType}`,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_cents: 0,
      task_type: task.task_type,
    })
  } catch {
    // Best-effort — don't fail the worker if error logging fails
  }
}
