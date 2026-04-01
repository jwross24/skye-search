import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export const dynamic = 'force-dynamic'

/**
 * GET /api/export — Download Everything
 *
 * Generates a ZIP archive of all user data:
 * - immigration_status.json
 * - daily_checkpoints.json
 * - applications.json
 * - jobs.json
 * - contacts.json
 * - plans.json
 * - preferences.json
 * - documents/ (CV files from storage)
 *
 * No cooldown, no paywall. Available at any time.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id

    // Query all user data in parallel
    const [
      userData,
      immigrationStatus,
      checkpoints,
      applications,
      jobs,
      contacts,
      plans,
      documents,
      votes,
    ] = await Promise.all([
      supabase.from('users').select('profile, skills, user_preferences').eq('id', userId).single(),
      supabase.from('immigration_status').select('*').eq('user_id', userId).single(),
      supabase.from('daily_checkpoint').select('*').eq('user_id', userId).order('checkpoint_date', { ascending: true }),
      supabase.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('contacts').select('*').eq('user_id', userId).order('name', { ascending: true }),
      supabase.from('plans').select('*').eq('user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('votes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ])

    // Build ZIP archive
    const archive = archiver('zip', { zlib: { level: 6 } })
    const passThrough = new PassThrough()
    archive.pipe(passThrough)

    // Add JSON files
    const addJson = (name: string, data: unknown) => {
      archive.append(JSON.stringify(data, null, 2), { name })
    }

    addJson('immigration_status.json', immigrationStatus.data ?? {})
    addJson('daily_checkpoints.json', checkpoints.data ?? [])
    addJson('applications.json', applications.data ?? [])
    addJson('jobs.json', jobs.data ?? [])
    addJson('contacts.json', contacts.data ?? [])
    addJson('plans.json', plans.data ?? [])
    addJson('votes.json', votes.data ?? [])
    addJson('preferences.json', {
      profile: userData.data?.profile ?? {},
      skills: userData.data?.skills ?? [],
      user_preferences: userData.data?.user_preferences ?? {},
    })

    // Add document files from storage
    const docs = documents.data ?? []
    for (const doc of docs) {
      if (doc.file_path) {
        const { data: fileData } = await supabase.storage
          .from('cv-uploads')
          .download(doc.file_path)

        if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const fileName = doc.file_path.split('/').pop() ?? `document-${doc.id}`
          archive.append(buffer, { name: `documents/${fileName}` })
        }
      }

      // Include structured data alongside the file
      if (doc.structured_data_json) {
        addJson(`documents/${doc.id}-structured.json`, doc.structured_data_json)
      }
    }

    // Add export metadata
    // Build the file list to match exactly what was added to the archive above.
    const docFileEntries: string[] = []
    for (const d of docs) {
      if (d.file_path) {
        docFileEntries.push(`documents/${d.file_path.split('/').pop() ?? `document-${d.id}`}`)
      }
      if (d.structured_data_json) {
        docFileEntries.push(`documents/${d.id}-structured.json`)
      }
    }

    addJson('_export_metadata.json', {
      exported_at: new Date().toISOString(),
      user_id: userId,
      user_email: user.email,
      version: '1.0',
      files: [
        'immigration_status.json',
        'daily_checkpoints.json',
        'applications.json',
        'jobs.json',
        'contacts.json',
        'plans.json',
        'votes.json',
        'preferences.json',
        ...docFileEntries,
      ],
    })

    // Convert Node.js stream to Web ReadableStream for Next.js Response.
    // Listeners are registered in start() (runs synchronously in constructor)
    // before archive.finalize() is called, so no data is lost.
    const webStream = new ReadableStream({
      start(controller) {
        // Forward archiver errors (e.g. invalid entry, internal ZIP failure)
        archive.on('error', (err) => {
          controller.error(err)
        })
        passThrough.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })
        passThrough.on('end', () => {
          controller.close()
        })
        passThrough.on('error', (err) => {
          controller.error(err)
        })
        // Finalize after all listeners are attached — guarantees no data events
        // can fire before the controller is ready to receive them.
        archive.finalize()
      },
    })

    const today = new Date().toISOString().split('T')[0]

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="skye-search-export-${today}.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[export] Unexpected error generating export:', err)
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}
