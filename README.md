# Dad Care

Web app (PWA) for Dad's phone and Phil's caregiver dashboard. See `CLAUDE.md` for the product rules and build order, and `docs/prototype.html` for the clickable prototype.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm run dev
```

Open http://localhost:3000. `/dashboard` shows whether Supabase and the database schema are connected.

## Set up Supabase (once)

1. Create a free project at https://supabase.com (region: closest to Nigeria, e.g. EU West / Frankfurt).
2. Copy the Project URL and publishable key into `.env.local`.
3. Apply the schema: open SQL Editor in the Supabase dashboard, paste `supabase/migrations/20261024000000_core_data_model.sql`, and run it.
   (Or with the CLI: `npx supabase login`, `npx supabase link`, `npx supabase db push`.)
4. Optional: `npm run db:types` generates exact TypeScript types from the live database.
