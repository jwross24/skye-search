import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted helpers (available to vi.mock factories) ─────────────────────────

const { makeCheerioMock, defaultBodyText } = vi.hoisted(() => {
  const defaultBodyText = 'Ocean biogeochemistry research role. '.repeat(20)

  function makeCheerioMock(bodyText: string) {
    return vi.fn().mockImplementation((sel: string) => {
      if (sel === 'body') {
        return { text: () => bodyText, remove: vi.fn() }
      }
      return { remove: vi.fn(), text: () => '' }
    })
  }

  return { makeCheerioMock, defaultBodyText }
})

// ─── Mock setup (before action imports) ──────────────────────────────────────

const mockUser = { id: 'user-abc' }
const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: () => ({ insert: mockInsert }),
  }),
}))

const mockCheckBudget = vi.fn().mockResolvedValue({ action: 'allow' })
vi.mock('@/lib/budget-guard', () => ({
  checkBudget: (...args: unknown[]) => mockCheckBudget(...args),
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock cheerio — handles $('body').text() and $('selector').remove()
vi.mock('cheerio', () => ({
  load: vi.fn().mockImplementation(() => makeCheerioMock(defaultBodyText)),
}))

// Mock Anthropic SDK
const mockParsedOutput = {
  title: 'Research Scientist',
  company: 'Woods Hole Oceanographic Institution',
  location: 'Woods Hole, MA',
  visa_path: 'cap_exempt',
  employer_type: 'nonprofit_research',
  application_deadline: '2026-06-01',
  description_summary: 'Ocean biogeochemistry research role focusing on PACE satellite data.',
}

const mockMessageParse = vi.fn().mockResolvedValue({
  parsed_output: mockParsedOutput,
  usage: { input_tokens: 2000, output_tokens: 200 },
})

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = function () {
    return { messages: { parse: mockMessageParse } }
  }
  return { default: MockAnthropic }
})

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn().mockReturnValue({ type: 'json_schema' }),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

const { analyzeJobUrl } = await import('./url-analysis-actions')

describe('analyzeJobUrl', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Restore defaults after clearAllMocks
    mockCheckBudget.mockResolvedValue({ action: 'allow' })
    mockMessageParse.mockResolvedValue({
      parsed_output: mockParsedOutput,
      usage: { input_tokens: 2000, output_tokens: 200 },
    })
    mockInsert.mockResolvedValue({ error: null })

    // Default fetch: returns enough HTML text
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        `<html><body><h1>Research Scientist</h1><p>${'Ocean research '.repeat(20)}</p></body></html>`,
      ),
    })

    // Restore cheerio load to default implementation after clearAllMocks
    const cheerio = await import('cheerio')
    vi.mocked(cheerio.load).mockImplementation(() => makeCheerioMock(defaultBodyText))

    // Set ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = 'test-key-xyz'
  })

  it('returns extracted fields on success', async () => {
    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(true)
    expect(result.fields).toMatchObject({
      title: 'Research Scientist',
      company: 'Woods Hole Oceanographic Institution',
      visa_path: 'cap_exempt',
      employer_type: 'nonprofit_research',
    })
  })

  it('returns error when URL is invalid', async () => {
    const result = await analyzeJobUrl('not-a-valid-url')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid URL')
  })

  it('returns error when URL uses non-http/https protocol (SSRF guard)', async () => {
    const result = await analyzeJobUrl('file:///etc/passwd')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid URL')
  })

  it('returns error when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI analysis unavailable — add details manually')
  })

  it('returns error when budget is exhausted', async () => {
    mockCheckBudget.mockResolvedValue({
      action: 'pause',
      reason: 'Daily cap reached',
    })

    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('daily budget reached')
  })

  it('returns error when fetch returns non-OK status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })

    const result = await analyzeJobUrl('https://whoi.edu/jobs/missing')

    expect(result.success).toBe(false)
    expect(result.error).toContain('HTTP 404')
  })

  it('returns error when fetch throws (timeout, network error)', async () => {
    mockFetch.mockRejectedValue(new Error('TimeoutError: The operation was aborted'))

    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Could not reach that URL')
  })

  it('returns error when page has too little text content', async () => {
    const cheerio = await import('cheerio')
    vi.mocked(cheerio.load).mockReturnValueOnce(makeCheerioMock('tiny'))

    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<html><body>tiny</body></html>'),
    })

    const result = await analyzeJobUrl('https://jobs.example.com/js-only-page')

    expect(result.success).toBe(false)
    expect(result.error).toContain('too little text content')
  })

  it('URL content is passed as document block, NOT interpolated into system prompt', async () => {
    await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(mockMessageParse).toHaveBeenCalledOnce()
    const callArgs = mockMessageParse.mock.calls[0][0]

    // System prompt should NOT contain the URL or page content
    const systemText = callArgs.system[0].text
    expect(systemText).not.toContain('whoi.edu')
    expect(systemText).not.toContain('page_content')

    // Content should be in the user message as a text block containing the URL
    const userContent = callArgs.messages[0].content
    expect(Array.isArray(userContent)).toBe(true)
    const pageBlock = userContent.find(
      (block: { type: string; text?: string }) =>
        block.type === 'text' && block.text?.includes('page_content'),
    )
    expect(pageBlock).toBeDefined()
    expect(pageBlock.text).toContain('url="https://whoi.edu/jobs/123"')
  })

  it('logs cost to api_usage_log on success', async () => {
    await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        model: 'claude-haiku-4-5-20251001',
        input_tokens: 2000,
        output_tokens: 200,
        task_type: 'url_analysis',
        estimated_cost_cents: expect.any(Number),
      }),
    )
    // 2000 * 0.0000008 * 100 + 200 * 0.000004 * 100 = 0.16 + 0.08 = 0.24 → ceil = 1
    const callArg = mockInsert.mock.calls[0][0]
    expect(callArg.estimated_cost_cents).toBe(1)
  })

  it('calls budget guard with correct userId and taskType', async () => {
    await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(mockCheckBudget).toHaveBeenCalledWith({
      userId: mockUser.id,
      taskType: 'url_analysis',
    })
  })

  it('returns error when parsed_output is null', async () => {
    mockMessageParse.mockResolvedValue({
      parsed_output: null,
      usage: { input_tokens: 100, output_tokens: 10 },
    })

    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Could not extract job details')
  })

  it('returns unauthenticated error when not logged in', async () => {
    const { createClient } = await import('@/db/supabase-server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: () => ({ insert: mockInsert }),
    } as never)

    const result = await analyzeJobUrl('https://whoi.edu/jobs/123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })
})
