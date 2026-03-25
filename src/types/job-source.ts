/**
 * Source adapter types — the contract all job source adapters implement.
 * "Source abstraction layer with pluggable adapters:
 *  each adapter implements discover(queries) → DiscoveredJob[]"
 */

export type SourceType = 'industry' | 'government' | 'academic' | 'until_filled'

export interface DiscoveryQuery {
  keywords: string[]
  domains?: string[]
  location?: string
  source_type: SourceType
}

export interface DiscoveredJob {
  source: string
  url: string
  title: string
  company: string
  raw_description: string | null
  canonical_url: string
  normalized_company: string
  indexed_date: string // ISO timestamptz
  source_type: SourceType
  structured_deadline?: string | null
  structured_salary?: string | null
  structured_location?: string | null
}

export interface AdapterError {
  adapter: string
  message: string
  query?: DiscoveryQuery
}

export interface AdapterResult {
  jobs: DiscoveredJob[]
  errors: AdapterError[]
  metadata: {
    request_count: number
    latency_ms: number
  }
}

export interface HealthCheckResult {
  healthy: boolean
  latencyMs: number
  error?: string
}

export interface JobSourceAdapter {
  /** Adapter identifier (e.g., 'usajobs', 'higheredjobs', 'exa') */
  name: string
  /** Main entry point — run discovery queries and return jobs */
  discover(queries: DiscoveryQuery[]): Promise<AdapterResult>
  /** Health check for degradation detection */
  healthCheck(): Promise<HealthCheckResult>
}
