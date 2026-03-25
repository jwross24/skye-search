/**
 * Adapter registry — registers, retrieves, and orchestrates job source adapters.
 * Each adapter failure is isolated — one crashing doesn't block others.
 */

import type {
  JobSourceAdapter,
  DiscoveryQuery,
  AdapterResult,
} from '@/types/job-source'

const adapters = new Map<string, JobSourceAdapter>()

export function registerAdapter(adapter: JobSourceAdapter): void {
  if (adapters.has(adapter.name)) {
    throw new Error(`Adapter "${adapter.name}" is already registered`)
  }
  adapters.set(adapter.name, adapter)
}

export function getAdapter(name: string): JobSourceAdapter {
  const adapter = adapters.get(name)
  if (!adapter) {
    throw new Error(`Adapter "${name}" not found`)
  }
  return adapter
}

export function getAllAdapters(): JobSourceAdapter[] {
  return Array.from(adapters.values())
}

export async function discoverAll(
  queries: DiscoveryQuery[],
): Promise<{ results: Map<string, AdapterResult>; failures: string[] }> {
  const results = new Map<string, AdapterResult>()
  const failures: string[] = []
  const all = getAllAdapters()

  const settled = await Promise.allSettled(
    all.map(async (adapter) => {
      const start = performance.now()
      try {
        const result = await adapter.discover(queries)
        const latency = Math.round(performance.now() - start)
        console.log(
          `Adapter ${adapter.name}: ${result.jobs.length} jobs discovered in ${latency}ms`,
        )
        return { name: adapter.name, result }
      } catch (error) {
        const latency = Math.round(performance.now() - start)
        const message = error instanceof Error ? error.message : String(error)
        console.error(
          `Adapter ${adapter.name}: FAILED in ${latency}ms — ${message}`,
        )
        throw { name: adapter.name, error: message }
      }
    }),
  )

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.set(outcome.value.name, outcome.value.result)
    } else {
      const reason = outcome.reason as { name: string; error: string }
      failures.push(reason.name)
    }
  }

  const totalJobs = Array.from(results.values()).reduce(
    (sum, r) => sum + r.jobs.length,
    0,
  )
  console.log(
    `Discovery complete: ${totalJobs} jobs from ${results.size}/${all.length} adapters`,
  )

  return { results, failures }
}

/** Reset registry — for testing only */
export function clearRegistry(): void {
  adapters.clear()
}
