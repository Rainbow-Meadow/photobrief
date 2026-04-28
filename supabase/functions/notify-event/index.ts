// Server-side dispatcher for app notifications.
// Triggered by DB hooks via pg_net. Looks up the data needed for each
// event and invokes send-transactional-email with the right template.
//
// Auth: requires the SUPABASE_SERVICE_ROLE_KEY in the Authorization header
// (the DB stores this in vault and forwards it via pg_net).
//
// Supported events:
//   - user_signup        { user_id }
//   - submission_received { submission_id }

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const APP_BASE_URL = 'https://photobrief.ai'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Authenticate the caller against the service role key (used by the DB hook).
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token || token !== serviceKey) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: { event?: string; user_id?: string; submission_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  async function send(templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, unknown>) {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    })
    if (error) console.error('send-transactional-email failed', { templateName, error })
  }

  try {
    if (body.event === 'user_signup' && body.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', body.user_id)
        .maybeSingle()
      if (!profile?.email) return json({ ok: true, skipped: 'no_email' })
      await send(
        'workspace-welcome',
        profile.email,
        `welcome-${body.user_id}`,
        { name: profile.name ?? undefined, dashboardUrl: `${APP_BASE_URL}/dashboard` },
      )
      return json({ ok: true })
    }

    if (body.event === 'submission_received' && body.submission_id) {
      // Fetch submission + request + guide
      const { data: sub } = await supabase
        .from('submissions')
        .select('id, workspace_id, request_id, submitter_name, photo_brief_requests(guide_id, photo_guides(name))')
        .eq('id', body.submission_id)
        .maybeSingle()
      if (!sub) return json({ ok: true, skipped: 'no_submission' })

      const guideName = (sub as any).photo_brief_requests?.photo_guides?.name ?? null

      // Photo count (best-effort)
      const { count: photoCount } = await supabase
        .from('captured_media')
        .select('id', { count: 'exact', head: true })
        .eq('submission_id', sub.id)

      // Active workspace members
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', sub.workspace_id)
        .eq('status', 'active')
      const memberIds = (members ?? []).map((m: any) => m.user_id)
      if (memberIds.length === 0) return json({ ok: true, skipped: 'no_members' })

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', memberIds)

      const reviewUrl = `${APP_BASE_URL}/submissions/${sub.id}`
      for (const p of profiles ?? []) {
        if (!p.email) continue
        await send(
          'submission-received',
          p.email,
          `submission-${sub.id}-${p.id}`,
          {
            ownerName: p.name ?? undefined,
            recipientName: sub.submitter_name ?? undefined,
            guideName: guideName ?? undefined,
            reviewUrl,
            photoCount: photoCount ?? undefined,
          },
        )
      }
      return json({ ok: true, notified: profiles?.length ?? 0 })
    }

    return json({ error: 'Unknown event' }, 400)
  } catch (err) {
    console.error('notify-event error', err)
    return json({ error: 'Internal error' }, 500)
  }
})
