/**
 * Cloudflare Pages middleware: inject OG tags for social crawlers on /gift/:id.
 * Browsers always get the SPA via context.next(). Client-side useGiftMeta covers JS crawlers.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Slackbot|Pinterest|iMessage|Applebot|preview/i

const BRAND = {
  name: 'Cuddlepost',
  tagline: 'A little hug, posted in seconds',
  description: 'Send a personalized digital plushie with a private message. A little hug, posted in seconds.',
}

type PagesContext = {
  request: Request
  next: () => Promise<Response>
  env: { VITE_SUPABASE_URL?: string; SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string; SUPABASE_ANON_KEY?: string }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url)
  const match = url.pathname.match(/^\/gift\/([^/]+)\/?$/)
  if (!match) return context.next()

  const ua = context.request.headers.get('user-agent') || ''
  if (!BOT_UA.test(ua)) return context.next()

  const id = match[1]
  let title = `${BRAND.name} gift`
  let description = BRAND.description

  const supabaseUrl = context.env.SUPABASE_URL || context.env.VITE_SUPABASE_URL
  const anon = context.env.SUPABASE_ANON_KEY || context.env.VITE_SUPABASE_ANON_KEY
  if (supabaseUrl && anon) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gifts?id=eq.${encodeURIComponent(id)}&select=sender_name,recipient_name,occasion,status&limit=1`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      })
      if (res.ok) {
        const rows = (await res.json()) as { sender_name?: string; recipient_name?: string; occasion?: string; status?: string }[]
        const g = rows[0]
        if (g && g.status !== 'deleted' && g.status !== 'reported') {
          title = `${g.sender_name || 'Someone'} sent you a ${BRAND.name}`
          description = `${g.occasion || 'Just because'} · a personalized plushie for ${g.recipient_name || 'you'}`
        }
      }
    } catch {
      /* fall back to generic OG */
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(url.href)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="robots" content="noindex, nofollow" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url.pathname)}" />
</head>
<body>
  <p><a href="${escapeHtml(url.pathname)}">${escapeHtml(title)}</a></p>
</body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
