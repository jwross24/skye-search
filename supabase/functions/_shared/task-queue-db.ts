import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { TaskRow, TaskQueueDb } from './task-types.ts'

export function createTaskQueueDb(supabase: SupabaseClient): TaskQueueDb {
  return {
    async dequeueTasks(batchSize = 10): Promise<TaskRow[]> {
      const { data, error } = await supabase.rpc('dequeue_task', {
        batch_size: batchSize,
      })
      if (error) throw new Error(`dequeueTasks failed: ${error.message}`)
      return (data ?? []) as TaskRow[]
    },

    async completeTask(taskId: string, resultJson: Record<string, unknown>): Promise<void> {
      const { error } = await supabase
        .from('task_queue')
        .update({ status: 'completed', result_json: resultJson })
        .eq('id', taskId)
        .eq('status', 'processing')
      if (error) throw new Error(`completeTask failed: ${error.message}`)
    },

    async retryTask(taskId: string, errorLog: string, nextRetryAt: Date): Promise<void> {
      const { error } = await supabase.rpc('retry_task', {
        task_id: taskId,
        error_text: errorLog,
        next_retry: nextRetryAt.toISOString(),
      })
      if (error) throw new Error(`retryTask failed: ${error.message}`)
    },

    async deadLetterTask(taskId: string, errorLog: string): Promise<void> {
      const { error } = await supabase
        .from('task_queue')
        .update({
          status: 'failed_retry' as const,
          dead_lettered_at: new Date().toISOString(),
          error_log: errorLog,
        })
        .eq('id', taskId)
        .eq('status', 'processing')
      if (error) throw new Error(`deadLetterTask failed: ${error.message}`)
    },

    async failValidation(taskId: string, errorLog: string): Promise<void> {
      const { error } = await supabase
        .from('task_queue')
        .update({
          status: 'failed_validation' as const,
          error_log: errorLog,
        })
        .eq('id', taskId)
      if (error) throw new Error(`failValidation failed: ${error.message}`)
    },

    async enqueueTask(params): Promise<string> {
      const { data, error } = await supabase
        .from('task_queue')
        .insert({
          user_id: params.userId,
          task_type: params.taskType,
          payload_json: params.payloadJson,
          max_retries: params.maxRetries ?? 3,
        })
        .select('id')
        .single()
      if (error) throw new Error(`enqueueTask failed: ${error.message}`)
      return data.id
    },

    async hasPendingTask(
      userId: string,
      taskType: string,
      windowMinutes: number,
    ): Promise<boolean> {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('task_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('task_type', taskType)
        .in('status', ['pending', 'processing'])
        .gte('created_at', windowStart)
      if (error) throw new Error(`hasPendingTask failed: ${error.message}`)
      return (count ?? 0) > 0
    },
  }
}
