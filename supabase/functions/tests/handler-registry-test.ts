/// <reference lib="deno.ns" />
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  registerHandler,
  getHandler,
  getAllHandlers,
  clearHandlers,
} from '../_shared/handler-registry.ts'
import type { TaskHandler } from '../_shared/task-types.ts'

function makeHandler(taskType: string): TaskHandler {
  return {
    taskType,
    execute: async () => ({ success: true }),
  }
}

Deno.test({
  name: 'handler registry',
  fn: async (t: Deno.TestContext) => {
    // Clean state before each sub-test group
    clearHandlers()

    await t.step('registers and retrieves a handler', () => {
      clearHandlers()
      const handler = makeHandler('tailor_docs')
      registerHandler(handler)
      assertEquals(getHandler('tailor_docs'), handler)
    })

    await t.step('returns undefined for unregistered task type', () => {
      clearHandlers()
      assertEquals(getHandler('nonexistent'), undefined)
    })

    await t.step('throws on duplicate registration', () => {
      clearHandlers()
      registerHandler(makeHandler('scrape_url'))
      assertThrows(
        () => registerHandler(makeHandler('scrape_url')),
        Error,
        'already registered',
      )
    })

    await t.step('getAllHandlers returns all registered', () => {
      clearHandlers()
      registerHandler(makeHandler('type_a'))
      registerHandler(makeHandler('type_b'))
      assertEquals(getAllHandlers().length, 2)
    })

    await t.step('clearHandlers resets the registry', () => {
      clearHandlers()
      registerHandler(makeHandler('type_c'))
      clearHandlers()
      assertEquals(getAllHandlers().length, 0)
      assertEquals(getHandler('type_c'), undefined)
    })
  },
})
