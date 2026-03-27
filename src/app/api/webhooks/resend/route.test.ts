import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock resend client and verification
const mockGet = vi.fn()
const mockVerify = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResendClient: vi.fn(() => ({
    emails: {
      receiving: { get: mockGet },
    },
    webhooks: { verify: mockVerify },
  })),
  verifyWebhookSignature: vi.fn(() => mockVerify()),
}))

// Mock Supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@supabase/supabase-js', () => {
  function queryBuilder(value: unknown) {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => Promise.resolve(value).then(resolve)
        if (prop === 'insert') return mockInsert
        return () => queryBuilder(value)
      },
    })
  }
  return {
    createClient: vi.fn(() => ({
      from: (table: string) => {
        if (table === 'users') return queryBuilder({ data: [{ id: 'user-1' }] })
        if (table === 'raw_inbound_email') return { insert: mockInsert }
        return queryBuilder({ data: null })
      },
    })),
  }
})

import { POST } from './route'

function makeWebhookRequest(headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/webhooks/resend', {
    method: 'POST',
    headers: {
      'svix-id': 'msg_123',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,signature',
      ...headers,
    },
    body: '{"type":"email.received","data":{}}',
  })
}

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'
  })

  it('returns 400 when svix headers are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/resend', {
      method: 'POST',
      body: '{}',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing webhook headers')
  })

  it('returns 200 and stores email on email.received event', async () => {
    mockVerify.mockReturnValue({
      type: 'email.received',
      data: { email_id: 'email-abc' },
    })

    mockGet.mockResolvedValue({
      data: {
        id: 'email-abc',
        from: 'alerts@indeed.com',
        to: ['skye@inbox.example.com'],
        subject: 'New jobs matching your search',
        text: '5 new postdoc positions found.',
        html: '<p>5 new postdoc positions found.</p>',
        attachments: [],
      },
    })

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.received).toBe(true)

    // Verify the email was stored in raw_inbound_email
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      sender: 'alerts@indeed.com',
      subject: 'New jobs matching your search',
      body_text: '5 new postdoc positions found.',
      attachments_json: null,
      status: 'unprocessed',
    })
  })

  it('handles emails with attachments (stores metadata only)', async () => {
    mockVerify.mockReturnValue({
      type: 'email.received',
      data: { email_id: 'email-with-pdf' },
    })

    mockGet.mockResolvedValue({
      data: {
        id: 'email-with-pdf',
        from: 'hr@university.edu',
        to: ['skye@inbox.example.com'],
        subject: 'Offer letter attached',
        text: 'Please review.',
        attachments: [
          { id: 'att-1', filename: 'offer.pdf', content_type: 'application/pdf', size: 45000, content_id: null, content_disposition: 'attachment' },
        ],
      },
    })

    await POST(makeWebhookRequest())

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments_json: [
          { id: 'att-1', filename: 'offer.pdf', content_type: 'application/pdf', size: 45000 },
        ],
      }),
    )
  })

  it('handles emails without attachments (undefined from SDK)', async () => {
    mockVerify.mockReturnValue({
      type: 'email.received',
      data: { email_id: 'email-no-attach' },
    })

    mockGet.mockResolvedValue({
      data: {
        id: 'email-no-attach',
        from: 'test@example.com',
        subject: 'No attachments',
        text: 'Plain text.',
        attachments: undefined, // SDK returns undefined for no attachments
      },
    })

    await POST(makeWebhookRequest())

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments_json: null,
      }),
    )
  })

  it('returns 200 for non-received events (sent, delivered, etc.)', async () => {
    mockVerify.mockReturnValue({
      type: 'email.delivered',
      data: { email_id: 'msg-123' },
    })

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(mockGet).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 400 when signature verification fails', async () => {
    const { verifyWebhookSignature } = await import('@/lib/resend')
    vi.mocked(verifyWebhookSignature).mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

  it('does not store email when SDK returns null data', async () => {
    mockVerify.mockReturnValue({
      type: 'email.received',
      data: { email_id: 'email-missing' },
    })

    mockGet.mockResolvedValue({ data: null })

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
