# Cuddlepost

Independent digital plushie gift app. Own repo — no shared packages with the other brands.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Dev server: http://localhost:5175

## Build

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages. Functions under `functions/` inject OG tags for gift links.

## Supabase

Run `supabase/migrations/001_gifts.sql` in your Supabase SQL editor for this project.
