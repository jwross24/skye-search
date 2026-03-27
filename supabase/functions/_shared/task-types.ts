export type TaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed_retry'
  | 'failed_validation'

export interface TaskRow {
  id: string
  user_id: string
  task_type: string
  status: TaskStatus
  payload_json: Record<string, unknown> | null
  result_json: Record<string, unknown> | null
  error_log: string | null
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  dead_lettered_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  /** If true, the error is non-retryable (e.g. invalid payload) */
  permanent?: boolean
}

export interface TaskHandler {
  taskType: string
  execute(task: TaskRow): Promise<TaskResult>
}

export interface WorkerResult {
  processed: number
  completed: number
  retried: number
  deadLettered: number
  failed: number
  errors: Array<{ taskId: string; taskType: string; error: string }>
}

export interface TaskQueueDb {
  dequeueTasks(batchSize?: number): Promise<TaskRow[]>
  completeTask(taskId: string, resultJson: Record<string, unknown>): Promise<void>
  retryTask(taskId: string, errorLog: string, nextRetryAt: Date): Promise<void>
  deadLetterTask(taskId: string, errorLog: string): Promise<void>
  failValidation(taskId: string, errorLog: string): Promise<void>
  enqueueTask(params: {
    userId: string
    taskType: string
    payloadJson: Record<string, unknown>
    maxRetries?: number
  }): Promise<string>
  hasPendingTask(
    userId: string,
    taskType: string,
    windowMinutes: number,
  ): Promise<boolean>
}
