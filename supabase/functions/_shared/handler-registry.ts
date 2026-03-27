import type { TaskHandler } from './task-types.ts'

const handlers = new Map<string, TaskHandler>()

export function registerHandler(handler: TaskHandler): void {
  if (handlers.has(handler.taskType)) {
    throw new Error(`Handler for "${handler.taskType}" is already registered`)
  }
  handlers.set(handler.taskType, handler)
}

export function getHandler(taskType: string): TaskHandler | undefined {
  return handlers.get(taskType)
}

export function getAllHandlers(): TaskHandler[] {
  return Array.from(handlers.values())
}

/** Reset registry — for testing only */
export function clearHandlers(): void {
  handlers.clear()
}
