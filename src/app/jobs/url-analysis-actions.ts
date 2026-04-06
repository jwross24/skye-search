'use server'

/**
 * URL analysis server action — fetches a job posting URL, extracts text,
 * and uses Claude Haiku to populate structured job fields.
 *
 * Security note: URL content is passed as a <page_content> document block,
 * NOT interpolated into the system prompt. This prevents prompt injection
 * from malicious job posting text.
 */

import { createClient } from '@/db/supabase-server'

// UrlAnalysisResult is exported as an interface (erased at compile time by TypeScript).
// Client components must import it with `import type` — not as a runtime value.

export interface UrlAnalysisResult {
  success: boolean
  fields?: {
    title: string
    company: string
    location: string | null
    visa_path: 'cap_exempt' | 'cap_subject' | 'opt_compatible' | 'canada' | 'unknown'
    employer_type:
      | 'university'
      | 'nonprofit_research'
      | 'cooperative_institute'
      | 'government_contractor'
      | 'government_direct'
      | 'private_sector'
      | 'unknown'
    application_deadline: string | null
    description_summary: string | null
  }
  error?: string
}

export async function analyzeJobUrl(url: string): Promise<UrlAnalysisResult> {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // 2. Validate URL — only allow http/https to prevent SSRF via file://, ftp://, etc.
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { success: false, error: 'Invalid URL' }
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { success: false, error: 'Invalid URL' }
  }
  // Block private/loopback IPs — SSRF guard.
  // On Vercel, a request to 169.254.169.254 (AWS metadata API) or 127.x.x.x
  // could exfiltrate instance credentials. URL.hostname is already lowercased.
  const hostname = parsedUrl.hostname
  const BLOCKED_HOSTNAME_RE =
    /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/
  if (BLOCKED_HOSTNAME_RE.test(hostname)) {
    return { success: false, error: 'Invalid URL' }
  }

  // 3. Check API key availability
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'AI analysis unavailable — add details manually' }
  }

  // 4. Budget guard
  const { checkBudget } = await import('@/lib/budget-guard')
  const verdict = await checkBudget({ userId: user.id, taskType: 'url_analysis' })
  if (verdict.action === 'pause') {
    return {
      success: false,
      error: 'AI analysis unavailable today — daily budget reached. Add details manually.',
    }
  }

  // 5. Fetch URL content (server-side, no CORS)
  let html: string
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SkyeSearchBot/1.0 (+https://skye-search.vercel.app)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      return { success: false, error: `Could not fetch page (HTTP ${response.status})` }
    }
    html = await response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed'
    return { success: false, error: `Could not reach that URL: ${message}` }
  }

  // 6. Extract text from HTML using cheerio
  const cheerio = await import('cheerio')
  const $ = cheerio.load(html)
  // Remove noise: scripts, styles, nav chrome, footers
  $('script, style, nav, footer, header, noscript, iframe').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

  if (text.length < 50) {
    return {
      success: false,
      error:
        'Page has too little text content — it may require JavaScript to load. Add details manually.',
    }
  }

  // 7. Claude Haiku structured extraction
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
    const { z } = await import('zod')

    const JobExtractionSchema = z.object({
      title: z.string().describe('Job title'),
      company: z.string().describe('Employer/company/institution name'),
      location: z
        .string()
        .nullable()
        .describe(
          'Job location (city, state/province) or null if fully remote or unspecified',
        ),
      visa_path: z
        .enum(['cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown'])
        .describe(
          'cap_exempt = university, nonprofit, gov lab (H-1B cap-exempt). cap_subject = private company standard H-1B. opt_compatible = explicitly OPT-friendly. canada = Canadian employer. unknown = not enough info.',
        ),
      employer_type: z.enum([
        'university',
        'nonprofit_research',
        'cooperative_institute',
        'government_contractor',
        'government_direct',
        'private_sector',
        'unknown',
      ]),
      application_deadline: z
        .string()
        .nullable()
        .describe('Application deadline as YYYY-MM-DD, or null if not mentioned'),
      description_summary: z
        .string()
        .nullable()
        .describe('2-3 sentence summary of the role and key requirements'),
    })

    const client = new Anthropic()
    const message = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: 'You extract structured job posting information from web page text. The user is an international PhD scientist (F-1 STEM OPT visa) looking for cap-exempt employers (universities, nonprofits, government labs). Be precise about visa_path classification — this affects real immigration decisions.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the job posting details from this page:' },
            {
              type: 'text',
              // Use parsedUrl.href (browser-normalized, no raw user string) to avoid
              // XML attribute injection from crafted URL strings like https://evil.com/">...
              text: `<page_content url="${parsedUrl.href}">\n${text}\n</page_content>`,
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(JobExtractionSchema) },
    })

    // 8. Log cost to api_usage_log
    // Haiku pricing: $0.80/MTok input, $4/MTok output (as of 2026-04)
    const { error: insertError } = await supabase.from('api_usage_log').insert({
      user_id: user.id,
      model: 'claude-haiku-4-5-20251001',
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      estimated_cost_cents: Math.ceil(
        message.usage.input_tokens * 0.0000008 * 100 +
          message.usage.output_tokens * 0.000004 * 100,
      ),
      task_type: 'url_analysis',
    })
    if (insertError) {
      // Non-fatal: log the error but don't fail the analysis result
      console.error('[url-analysis] Failed to log API usage:', insertError.message)
    }

    if (!message.parsed_output) {
      return {
        success: false,
        error: 'Could not extract job details from this page. Add details manually.',
      }
    }

    return { success: true, fields: message.parsed_output }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'AI analysis failed'
    return { success: false, error: `Analysis failed: ${errorMessage}. Add details manually.` }
  }
}
