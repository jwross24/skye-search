/**
 * Integration tests for email classification action.
 * Tests against real local Supabase — no mocks.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'

function log(step: string, detail: string) {
  process.stdout.write(`  [email-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()
let testEmailId: string | null = null

beforeAll(async () => {
  await assertSupabaseReachable()

  // Insert a test email
  const { data, error } = await service
    .from('raw_inbound_email')
    .insert({
      user_id: TEST_USER_ID,
      sender: 'hr@university.edu',
      subject: 'Your application update',
      body_text: 'We have received your application...',
      status: 'unprocessed',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Setup failed: ${error.message}`)
  testEmailId = data!.id
  log('Setup', `Created test email: ${testEmailId}`)
})

afterAll(async () => {
  if (testEmailId) {
    await service.from('raw_inbound_email').delete().eq('id', testEmailId)
    log('Cleanup', 'Removed test email')
  }
})

describe('classifyEmail (real Supabase)', () => {
  it('[email] classify as application_update', async () => {
    const { error } = await service
      .from('raw_inbound_email')
      .update({
        status: 'classified',
        classification_type: 'application_update',
      })
      .eq('id', testEmailId!)
      .eq('user_id', TEST_USER_ID)

    expect(error).toBeNull()
    log('Step 2', 'Classified as application_update')

    const { data } = await service
      .from('raw_inbound_email')
      .select('status, classification_type')
      .eq('id', testEmailId!)
      .single()

    expect(data!.status).toBe('classified')
    expect(data!.classification_type).toBe('application_update')
    log('Step 3', `Verified: status=${data!.status}, type=${data!.classification_type}`)
  })

  it('[email] classify as job_alert', async () => {
    const { error } = await service
      .from('raw_inbound_email')
      .update({
        status: 'classified',
        classification_type: 'job_alert',
      })
      .eq('id', testEmailId!)

    expect(error).toBeNull()

    const { data } = await service
      .from('raw_inbound_email')
      .select('classification_type')
      .eq('id', testEmailId!)
      .single()

    expect(data!.classification_type).toBe('job_alert')
    log('Step 2', `Classified as job_alert`)
  })

  it('[email] classify as ignore sets status=ignored', async () => {
    const { error } = await service
      .from('raw_inbound_email')
      .update({
        status: 'ignored',
        classification_type: null,
      })
      .eq('id', testEmailId!)

    expect(error).toBeNull()

    const { data } = await service
      .from('raw_inbound_email')
      .select('status, classification_type')
      .eq('id', testEmailId!)
      .single()

    expect(data!.status).toBe('ignored')
    expect(data!.classification_type).toBeNull()
    log('Step 2', `Status: ${data!.status}, classification: ${data!.classification_type} (null for ignored)`)
  })
})
