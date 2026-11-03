# Candle Three

A mobile-first journal for the Daily, 4H, 15m model: a pre-trade checklist, a trade log with screenshots, and stats that show which conditions actually matter. It does not place trades or give signals.

Built with Next.js (App Router, TypeScript), Supabase (auth, Postgres with row-level security, private storage) and lightweight-charts for the Terms diagrams.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key, safe in the browser (row-level security protects the data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Used by `/api/account/delete`. Never expose it |
| `NEXT_PUBLIC_SITE_URL` | Local: `http://localhost:3000`. Production: your domain |
| `GROQ_API_KEY` | Optional. Server only. Enables the AI screenshot check (turn it on in Settings) |
| `GROQ_VISION_MODEL` | Optional. Overrides the default vision model (`qwen/qwen3.8-27b`) |
| `DATABASE_URL` | Optional. Only for running migrations from your machine, not needed on Vercel |

## Database

Apply the files in `supabase/migrations/` in order (`0001` to `0003`) once (SQL editor, or `psql "$DATABASE_URL" -f ...`). It creates the tables, row-level security policies and the private `trade-images` bucket.

## Sign-in

Enable Google and Email under Supabase, Authentication, Providers. Add your site URL and `/**` redirect under URL Configuration, and the Supabase callback as an authorised redirect URI in Google Cloud.

## Scripts

```bash
npm run dev      # develop
npm run build    # production build
npm run lint     # eslint
npm test         # unit tests (checklist logic, timezones, import/export, charts)
```

## Layout

- `src/lib/checklist.ts`: the Candle Three checklist, glossary and status logic
- `src/lib/useDraft.ts`: local-first draft that syncs across devices
- `src/lib/profile.tsx`: settings (timezone, limits, instruments, theme)
- `src/components/`: screens (Check, Log, Stats, Terms, Strategies, Settings, trade form)
- `reference/`: the original HTML prototype
- `PRODUCT.md`, `DESIGN.md`: product and design notes
