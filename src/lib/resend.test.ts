import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendEmail, getResendClient, checkDomainStatus, _resetClient } from './resend'

function log(step: string, detail: string) {
  process.stdout.write(`  [resend test] ${step}: ${detail}\n`)
}

// ─── Mock Resend SDK ────────────────────────────────────────────────────────

const mockSend = vi.fn()
const mockDomainsList = vi.fn()
const mockWebhooksVerify = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.emails = { send: mockSend }
    this.domains = { list: mockDomainsList }
    this.webhooks = { verify: mockWebhooksVerify }
  }),
}))

// ─── Env Helpers ────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

beforeEach(() => {
  _resetClient()
  mockSend.mockReset()
  mockDomainsList.mockReset()
  mockWebhooksVerify.mockReset()
  setEnv({
    RESEND_API_KEY: 're_test_key_123',
    RESEND_FROM_EMAIL: 'noreply@send.havendm.com',
    RESEND_WEBHOOK_SECRET: 'whsec_test_secret',
  })
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ─── Client Initialization ──────────────────────────────────────────────────

describe('Resend client', () => {
  it('creates Resend client with API key from env', () => {
    log('Step 1', 'Creating client with RESEND_API_KEY set')
    const client = getResendClient()
    expect(client).toBeDefined()
    expect(client.emails).toBeDefined()
    log('Step 2', 'Client created with emails.send method')
  })

  it('throws if RESEND_API_KEY is missing', () => {
    log('Step 1', 'Removing RESEND_API_KEY from env')
    setEnv({ RESEND_API_KEY: undefined })
    _resetClient()

    log('Step 2', 'Expect getResendClient to throw')
    expect(() => getResendClient()).toThrow('Missing required environment variable: RESEND_API_KEY')
  })

  it('reuses the same client instance', () => {
    const a = getResendClient()
    const b = getResendClient()
    expect(a).toBe(b)
  })
})

// ─── Send Email ─────────────────────────────────────────────────────────────

describe('sendEmail', () => {
  it('returns message ID on success', async () => {
    log('Step 1', 'Mocking successful send')
    mockSend.mockResolvedValue({
      data: { id: 'msg_abc123' },
      error: null,
    })

    const result = await sendEmail({
      to: 'skye@example.com',
      subject: 'Test email',
      text: 'Hello from SkyeSearch',
    })

    log('Step 2', `Received messageId=${result.id}`)
    expect(result.id).toBe('msg_abc123')
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'noreply@send.havendm.com',
      to: ['skye@example.com'],
      subject: 'Test email',
      text: 'Hello from SkyeSearch',
    }))
  })

  it('throws on 4xx/5xx with descriptive error', async () => {
    log('Step 1', 'Mocking Resend API error')
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Missing "to" field' },
    })

    await expect(sendEmail({
      to: '',
      subject: 'Test',
      text: 'Body',
    })).rejects.toThrow('Resend send failed: Missing "to" field (validation_error)')
  })

  it('throws when no message ID returned', async () => {
    mockSend.mockResolvedValue({ data: {}, error: null })

    await expect(sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Body',
    })).rejects.toThrow('no message ID returned')
  })

  it('uses correct from address from env', async () => {
    log('Step 1', 'Sending with RESEND_FROM_EMAIL=noreply@send.havendm.com')
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null })

    await sendEmail({ to: 'test@example.com', subject: 'From check', text: 'Body' })

    const call = mockSend.mock.calls[0][0]
    expect(call.from).toBe('noreply@send.havendm.com')
    log('Step 2', `from=${call.from}`)
  })

  it('throws if RESEND_FROM_EMAIL is missing', async () => {
    setEnv({ RESEND_FROM_EMAIL: undefined })
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null })

    await expect(sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Body',
    })).rejects.toThrow('Missing required environment variable: RESEND_FROM_EMAIL')
  })

  it('handles array of recipients', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg_2' }, error: null })

    await sendEmail({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Multi',
      text: 'Body',
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.to).toEqual(['a@example.com', 'b@example.com'])
  })

  it('passes optional cc, bcc, replyTo', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg_3' }, error: null })

    await sendEmail({
      to: 'test@example.com',
      subject: 'Options',
      text: 'Body',
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
      replyTo: 'reply@example.com',
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.cc).toEqual(['cc@example.com'])
    expect(call.bcc).toEqual(['bcc@example.com'])
    expect(call.replyTo).toBe('reply@example.com')
  })
})

// ─── Domain Verification ────────────────────────────────────────────────────

describe('checkDomainStatus', () => {
  it('returns verified when domain matches RESEND_FROM_EMAIL', async () => {
    log('Step 1', 'Mocking domain list with verified domain')
    mockDomainsList.mockResolvedValue({
      data: {
        data: [
          { name: 'send.havendm.com', status: 'verified' },
        ],
      },
      error: null,
    })

    const result = await checkDomainStatus()
    log('Step 2', `verified=${result.verified}, domain=${result.domain}`)
    expect(result.verified).toBe(true)
    expect(result.domain).toBe('send.havendm.com')
  })

  it('returns not verified when domain not found', async () => {
    mockDomainsList.mockResolvedValue({
      data: { data: [] },
      error: null,
    })

    const result = await checkDomainStatus()
    expect(result.verified).toBe(false)
    expect(result.spf).toBe('not_found')
  })

  it('throws on API error', async () => {
    mockDomainsList.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    })

    await expect(checkDomainStatus()).rejects.toThrow('Resend domain list failed: Unauthorized')
  })
})

// ─── Webhook Verification ───────────────────────────────────────────────────

describe('Webhook verification', () => {
  it('verifyWebhookSignature calls resend.webhooks.verify with correct params', async () => {
    const { verifyWebhookSignature } = await import('./resend')
    const resend = getResendClient()

    mockWebhooksVerify.mockReturnValue({ type: 'email.sent', data: {} })

    const result = verifyWebhookSignature(resend, '{"type":"email.sent"}', {
      id: 'svix_123',
      timestamp: '1234567890',
      signature: 'v1,abc123',
    })

    expect(mockWebhooksVerify).toHaveBeenCalledWith({
      payload: '{"type":"email.sent"}',
      headers: { id: 'svix_123', timestamp: '1234567890', signature: 'v1,abc123' },
      webhookSecret: 'whsec_test_secret',
    })
    expect(result).toEqual({ type: 'email.sent', data: {} })
  })

  it('throws if RESEND_WEBHOOK_SECRET is missing', async () => {
    setEnv({ RESEND_WEBHOOK_SECRET: undefined })
    const { verifyWebhookSignature } = await import('./resend')
    const resend = getResendClient()

    expect(() => verifyWebhookSignature(resend, '{}', {
      id: 'x', timestamp: 'x', signature: 'x',
    })).toThrow('Missing required environment variable: RESEND_WEBHOOK_SECRET')
  })
})
