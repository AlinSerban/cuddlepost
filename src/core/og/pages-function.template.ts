/**
 * Cloudflare Pages Function — inject Open Graph tags for gift links.
 *
 * Deploy each brand app as its own Pages project. Copy this file to:
 *   apps/<brand>/functions/gift/[[id]].ts
 *
 * Set SUPABASE_URL + SUPABASE_ANON_KEY in the Pages project env.
 * Bots get HTML with og:title/description; browsers get the SPA.
 *
 * Until this is live, client-side useGiftMeta() still sets tags for JS-capable clients.
 */

const BOT =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessage|Applebot|bingbot|Googlebot/i

export const onRequest: PagesFunction<{
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  BRAND_NAME?: string
}> = async (context) => {
  const ua = context.request.headers.get('user-agent') || ''
  const id = context.params.id
  const brand = context.env.BRAND_NAME || 'Gift'

  if (!BOT.test(ua) || !id || Array.isArray(id)) {
    return context.next()
  }

  let title = `${brand} gift`
  let description = 'Someone sent you a personalized digital plushie.'

  if (context.env.SUPABASE_URL && context.env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/gifts?id=eq.${encodeURIComponent(id)}&status=eq.paid&deleted_at=is.null&select=sender_name,recipient_name,occasion,plush`,
        {
          headers: {
            apikey: context.env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${context.env.SUPABASE_ANON_KEY}`,
          },
        },
      )
      const rows = (await res.json()) as {
        sender_name: string
        recipient_name: string
        occasion: string
        plush: string
      }[]
      const g = rows[0]
      if (g) {
        title = `${g.sender_name} sent you a ${brand}`
        description = `${g.occasion} · a personalized ${g.plush} for ${g.recipient_name}`
      }
    } catch {
      /* fall through with defaults */
    }
  }

  const url = new URL(context.request.url)
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex, nofollow"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(url.href)}"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
</head><body>
<p>${escapeHtml(title)}</p>
<p><a href="${escapeHtml(url.href)}">Open gift</a></p>
</body></html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}
