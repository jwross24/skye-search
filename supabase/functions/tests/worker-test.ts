/// <reference lib="deno.ns" />
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { processTaskBatch } from '../_shared/worker.ts'
import { registerHandler, clearHandlers } from '../_shared/handler-registry.ts'
import type { TaskRow, TaskQueueDb, TaskHandler } from '../_shared/task-types.ts'

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    user_id: 'user-1',
    task_type: 'test_echo',
    status: 'processing',
    payload_json: { msg: 'hello' },
    result_json: null,
    error_log: null,
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    dead_lettered_at: null,
    created_at: '2026-03-27T12:00:00Z',
    updated_at: '2026-03-27T12:00:00Z',
    ...overrides,
  }
}

function makeMockDb(overrides: Partial<TaskQueueDb> = {}): TaskQueueDb {
  return {
    dequeueTasks: () => Promise.resolve([]),
    completeTask: () => Promise.resolve(),
    retryTask: () => Promise.resolve(),
    deadLetterTask: () => Promise.resolve(),
    failValidation: () => Promise.resolve(),
    enqueueTask: () => Promise.resolve('new-id'),
    hasPendingTask: () => Promise.resolve(false),
    ...overrides,
  }
}

Deno.test({
  name: 'processTaskBatch',
  fn: async (t: Deno.TestContext) => {
    await t.step('returns zeros when queue is empty', async () => {
      clearHandlers()
      const db = makeMockDb()
      const result = await processTaskBatch(db, 10)
      assertEquals(result.processed, 0)
      assertEquals(result.completed, 0)
    })

    await t.step('completes task when handler succeeds', async () => {
      clearHandlers()
      let completedId = ''
      registerHandler({
        taskType: 'test_echo',
        execute: async () => ({ success: true, data: { echo: 'ok' } }),
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask()]),
        completeTask: (id, _result) => { completedId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.processed, 1)
      assertEquals(result.completed, 1)
      assertEquals(completedId, 'task-1')
    })

    await t.step('retries task when handler fails with retries remaining', async () => {
      clearHandlers()
      let retriedId = ''
      registerHandler({
        taskType: 'test_echo',
        execute: async () => ({ success: false, error: 'transient error' }),
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask({ retry_count: 0, max_retries: 3 })]),
        retryTask: (id, _err, _next) => { retriedId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.retried, 1)
      assertEquals(retriedId, 'task-1')
    })

    await t.step('dead-letters task when max retries exceeded', async () => {
      clearHandlers()
      let deadLetteredId = ''
      registerHandler({
        taskType: 'test_echo',
        execute: async () => ({ success: false, error: 'still failing' }),
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask({ retry_count: 2, max_retries: 3 })]),
        deadLetterTask: (id, _err) => { deadLetteredId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.deadLettered, 1)
      assertEquals(deadLetteredId, 'task-1')
    })

    await t.step('fails validation when no handler registered', async () => {
      clearHandlers()
      let failedId = ''
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask({ task_type: 'unknown_type' })]),
        failValidation: (id, _err) => { failedId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.failed, 1)
      assertEquals(failedId, 'task-1')
    })

    await t.step('fails validation on permanent error', async () => {
      clearHandlers()
      let failedId = ''
      registerHandler({
        taskType: 'test_echo',
        execute: async () => ({ success: false, error: 'bad payload', permanent: true }),
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask()]),
        failValidation: (id, _err) => { failedId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.failed, 1)
      assertEquals(failedId, 'task-1')
    })

    await t.step('handles thrown exceptions as retryable', async () => {
      clearHandlers()
      let retriedId = ''
      registerHandler({
        taskType: 'test_echo',
        execute: async () => { throw new Error('crash') },
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([makeTask()]),
        retryTask: (id, _err, _next) => { retriedId = id; return Promise.resolve() },
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.retried, 1)
      assertEquals(retriedId, 'task-1')
    })

    await t.step('processes multiple tasks in a batch', async () => {
      clearHandlers()
      registerHandler({
        taskType: 'type_a',
        execute: async () => ({ success: true }),
      })
      registerHandler({
        taskType: 'type_b',
        execute: async () => ({ success: false, error: 'fail' }),
      })
      const db = makeMockDb({
        dequeueTasks: () => Promise.resolve([
          makeTask({ id: 't1', task_type: 'type_a' }),
          makeTask({ id: 't2', task_type: 'type_b', retry_count: 0, max_retries: 3 }),
        ]),
        completeTask: () => Promise.resolve(),
        retryTask: () => Promise.resolve(),
      })
      const result = await processTaskBatch(db, 10)
      assertEquals(result.processed, 2)
      assertEquals(result.completed, 1)
      assertEquals(result.retried, 1)
    })
  },
})
