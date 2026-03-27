/// <reference lib="deno.ns" />
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39'

const EXTRACTION_PROMPT = `You are a CV/resume parser. Extract structured data from this document and return ONLY valid JSON matching this schema:

{
  "name": string | null,
  "field": string | null,
  "skills": string[],
  "research_areas": string[],
  "publications": [{ "title": string, "authors": string, "venue": string | null, "year": string | null }],
  "education": [{ "degree": string, "field": string, "institution": string, "year": string | null }],
  "employment_history": [{ "title": string, "organization": string, "start_date": string | null, "end_date": string | null, "description": string | null }]
}

Rules:
- Extract ONLY what is present in the document. Do NOT invent or hallucinate data.
- For skills: include technical skills, software, programming languages, methodologies, and domain expertise.
- For research_areas: extract broad research themes (e.g., "ocean color remote sensing", "coastal biogeochemistry").
- For publications: extract all listed publications, conference papers, and presentations.
- For dates: use ISO format (YYYY-MM-DD) when possible, or just the year (YYYY).
- Return null for fields not found in the document.
- Return empty arrays ([]) for list fields with no matches.
- Return ONLY the JSON object, no markdown fences, no explanation.`

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
    const bytes = new Uint8Array(arrayBuffer)

    // Chunked base64 encoding — spread operator crashes on >64KB arrays
    let binary = ''
    const CHUNK = 32768
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    const base64 = btoa(binary)

    // Determine media type from file extension
    const mediaType = filePath.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Call Claude Haiku for extraction
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500)
    }
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
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
    })

    // Parse Claude's response — strip markdown fences if present
    let responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    // Claude sometimes wraps JSON in ```json ... ``` despite instructions
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let extraction: Record<string, unknown>
    try {
      extraction = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse extraction response:', responseText.slice(0, 200))
      return jsonResponse({ error: 'Failed to parse extraction response' }, 500)
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
      // Haiku 4.5: $0.80/MTok input, $4.00/MTok output → cents per token
      estimated_cost_cents: Math.ceil(
        (message.usage.input_tokens * 0.00008 + message.usage.output_tokens * 0.0004) * 100,
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
    const message = err instanceof Error ? err.message : String(err)
    console.error('extract-cv error:', message)
    return jsonResponse({ ok: false, error: message }, 500)
  }
})

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
