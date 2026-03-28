/// <reference lib="deno.ns" />
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.80'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.80/helpers/zod'
import { z } from 'npm:zod@3'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'

// ─── Zod schema for structured output ────────────────────────────────────────
// Mirrors src/types/cv-extraction.ts but uses Zod 3 (SDK requirement).

const PublicationSchema = z.object({
  title: z.string(),
  authors: z.string(),
  venue: z.string().nullable(),
  year: z.string().nullable(),
})

const EducationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  year: z.string().nullable(),
})

const EmploymentSchema = z.object({
  title: z.string(),
  organization: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  description: z.string().nullable(),
})

const CvExtractionSchema = z.object({
  name: z.string().nullable(),
  field: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  publications: z.array(PublicationSchema),
  education: z.array(EducationSchema),
  employment_history: z.array(EmploymentSchema),
})

// ─── Extraction prompt (still guides quality even with structured output) ────

const EXTRACTION_PROMPT = `You are a CV/resume parser. Extract structured data from this document.

Rules:
- Extract ONLY what is present in the document. Do NOT invent or hallucinate data.
- For skills: include technical skills, software, programming languages, methodologies, and domain expertise.
- For research_areas: extract broad research themes (e.g., "ocean color remote sensing", "coastal biogeochemistry").
- For publications: extract all listed publications, conference papers, and presentations.
- For dates: use ISO format (YYYY-MM-DD) when possible, or just the year (YYYY).
- Return null for fields not found in the document.
- Return empty arrays ([]) for list fields with no matches.`

Deno.serve(async (req) => {
  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const supabase = getSupabaseAdmin()

    // Verify the user's JWT and get their ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Parse request body
    const { documentId, filePath } = await req.json()
    if (!documentId || !filePath) {
      return jsonResponse({ error: 'Missing documentId or filePath' }, 400)
    }

    // Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cv-uploads')
      .download(filePath)

    if (downloadError || !fileData) {
      return jsonResponse({ error: `File download failed: ${downloadError?.message}` }, 500)
    }

    // Convert to base64 for Claude document block
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = encodeBase64(new Uint8Array(arrayBuffer))

    // Determine media type from file extension
    const mediaType = filePath.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Budget check before API call (cv_extraction is non-critical)
    const { checkBudget } = await import('../_shared/budget-guard.ts')
    const budgetVerdict = await checkBudget({ userId: user.id, taskType: 'cv_extraction' })
    if (budgetVerdict.action === 'pause') {
      return jsonResponse({ error: 'API spend cap reached for today. Try again tomorrow.' }, 429)
    }

    // Call Claude Haiku with structured output
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500)
    }
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
      output_config: {
        format: zodOutputFormat(CvExtractionSchema),
      },
    })

    // Check stop_reason — truncated responses (max_tokens hit) have null parsed_output
    if (message.stop_reason !== 'end_turn') {
      console.error('extract-cv: unexpected stop_reason:', message.stop_reason)
      return jsonResponse({
        error: `Extraction incomplete (stop_reason: ${message.stop_reason}). The document may be too large.`,
      }, 500)
    }

    // parsed_output is already validated by the SDK — no manual JSON.parse needed
    const extraction = message.parsed_output
    if (!extraction) {
      return jsonResponse({ error: 'Extraction returned empty result' }, 500)
    }

    // Update the documents row with extracted data
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        structured_data_json: extraction,
        status: 'pending_review',
      })
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update document:', updateError.message)
    }

    // Log API usage (best-effort, don't fail extraction if logging fails)
    const { error: logError } = await supabase.from('api_usage_log').insert({
      user_id: user.id,
      model: message.model,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      // Haiku 4.5: $0.80/MTok input, $4.00/MTok output
      estimated_cost_cents: Math.ceil(
        message.usage.input_tokens * 0.00008 + message.usage.output_tokens * 0.0004,
      ),
      task_type: 'cv_extraction',
    })
    if (logError) console.error('Failed to log API usage:', logError.message)

    return jsonResponse({
      ok: true,
      extraction,
      documentUpdated: !updateError,
    })
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err)
    console.error('extract-cv error:', errMessage)
    return jsonResponse({ ok: false, error: errMessage }, 500)
  }
})

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
