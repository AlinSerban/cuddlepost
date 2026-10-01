# Email / Resend setup (local notes — do not commit secrets)

## You do in Resend (https://resend.com)
1. Sign up / log in
2. Create API key → copy it (starts with `re_`)
3. Domains → Add `cuddlepost.fun`
4. Copy the DNS records Resend shows (SPF / DKIM / etc.)

## DNS (Cloudflare → cuddlepost.fun → DNS)
Add each record Resend lists (type / name / value / proxy usually DNS only / grey cloud for email records).
Wait until Resend marks the domain **Verified**.

## Then tell the agent
- Resend API key (`re_...`)
- That domain is verified (or paste the DNS rows if you want the agent to try adding them)

## Agent will
- `supabase secrets set RESEND_API_KEY=... EMAIL_FROM=post@cuddlepost.fun`
- Deploy `send-email` function
- Set `VITE_EMAIL_ENABLED=true` on Pages + redeploy
