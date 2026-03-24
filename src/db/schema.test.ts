import { describe, it, expect } from 'vitest'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

describe('Core database schema types', () => {
  it('has all core tables', () => {
    type ExpectedTables =
      | 'users'
      | 'immigration_status'
      | 'daily_checkpoint'
      | 'cron_execution_log'
      | 'checkpoint_corrections'
      | 'jobs'
      | 'discovered_jobs'
      | 'applications'
      | 'votes'
      | 'skills'
      | 'milestones'
      | 'plans'
      | 'o1a_criteria'
      | 'contacts'
      | 'outreach_events'
      | 'documents'
      | 'task_queue'
      | 'api_usage_log'
      | 'weekly_activity_log'
      | 'travel_log'
      | 'canada_crs'
      | 'cap_exempt_employers'
      | 'cap_exempt_overrides'
      | 'e_verify_employers'
      | 'visa_bulletin'
      | 'raw_inbound_email'
      | 'deferred_email'

    // This is a compile-time check: if a table is missing from the generated
    // types, TypeScript will error on this assignment
    const _tableCheck: ExpectedTables extends keyof Tables ? true : false = true
    expect(_tableCheck).toBe(true)
  })

  it('ImmigrationStatus has required immigration fields', () => {
    type Row = Tables['immigration_status']['Row']
    const _check: {
      user_id: Row['user_id']
      visa_type: Row['visa_type']
      opt_expiry: Row['opt_expiry']
      employment_active: Row['employment_active']
      initial_days_used: Row['initial_days_used']
      initial_days_source: Row['initial_days_source']
      postdoc_end_date: Row['postdoc_end_date']
      grace_period_start_date: Row['grace_period_start_date']
    } = {} as Row
    expect(_check).toBeDefined()
  })

  it('DailyCheckpoint has correct structure', () => {
    type Row = Tables['daily_checkpoint']['Row']
    const _check: {
      id: Row['id']
      user_id: Row['user_id']
      checkpoint_date: Row['checkpoint_date']
      status_snapshot: Row['status_snapshot']
      unemployment_days_used_cumulative: Row['unemployment_days_used_cumulative']
      trigger_source: Row['trigger_source']
    } = {} as Row
    expect(_check).toBeDefined()
  })

  it('Application has all 11 kanban states in enum', () => {
    type KanbanStatus = Enums['kanban_status_type']
    const allStatuses: KanbanStatus[] = [
      'discovered', 'interested', 'tailoring', 'applied',
      'phone_screen', 'interview', 'offer', 'offer_accepted',
      'h1b_filed', 'rejected', 'withdrawn',
    ]
    expect(allStatuses).toHaveLength(11)
  })

  it('Job has visa path and employer type enums', () => {
    type VisaPath = Enums['visa_path_type']
    const paths: VisaPath[] = [
      'cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown',
    ]
    expect(paths).toHaveLength(5)

    type EmployerType = Enums['employer_type_type']
    const types: EmployerType[] = [
      'university', 'nonprofit_research', 'cooperative_institute',
      'government_contractor', 'government_direct', 'private_sector', 'unknown',
    ]
    expect(types).toHaveLength(7)
  })

  it('TaskQueue has retry fields with correct types', () => {
    type Row = Tables['task_queue']['Row']
    const _check: {
      retry_count: Row['retry_count']
      max_retries: Row['max_retries']
      next_retry_at: Row['next_retry_at']
      dead_lettered_at: Row['dead_lettered_at']
    } = {} as Row
    expect(_check).toBeDefined()
  })

  it('status_snapshot enum has all valid states', () => {
    type Snapshot = Enums['status_snapshot_type']
    const states: Snapshot[] = [
      'unemployed', 'employed_postdoc', 'employed_bridge',
      'employed_h1b', 'grace_period', 'CONFLICT',
    ]
    expect(states).toHaveLength(6)
  })

  it('cap_exempt_confidence enum has 4 tiers', () => {
    type Confidence = Enums['cap_exempt_confidence_type']
    const tiers: Confidence[] = ['none', 'unverified', 'likely', 'confirmed']
    expect(tiers).toHaveLength(4)
  })
})
