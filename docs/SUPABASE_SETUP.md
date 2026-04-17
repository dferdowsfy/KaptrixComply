# Supabase Setup — What Kaptrix Needs

This document is the single source of truth for what Kaptrix needs from
Supabase. Follow it top-to-bottom and the app will move from preview /
mock-data mode into a real persistent backend.

---

## 1. Project

You need **one Supabase project** (hosted or local).

- **Hosted (recommended for preview with a real URL):**
  - Create a project at <https://supabase.com>.
  - Region: closest to you.
  - Database password: store in your password manager.
- **Local (requires Docker Desktop):**
  - Install Docker Desktop.
  - `npx supabase start` from the repo root.
  - `npx supabase db push` to apply migrations.

---

## 2. Credentials (put in `.env.local`)

The app expects these exact variable names:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-side only, never expose
GOOGLE_API_KEY=<gemini api key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Where to get them:

- **Hosted:** Project → Settings → API → `Project URL`, `anon public`, `service_role`.
- **Local:** Printed by `npx supabase start` (API URL = `http://localhost:54321`).

The app will not attempt real auth until these values look real
(placeholders like `your-...` or `<from ...>` are rejected by
[src/lib/env.ts](src/lib/env.ts)).

---

## 3. Auth configuration

Kaptrix uses **email magic links** (no passwords).

In Supabase → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (dev) / your production URL later.
- **Redirect URLs allowlist** must include:
  - `http://localhost:3000/api/auth/callback`
  - Any additional hosts you deploy to.

In Authentication → Providers:

- **Email** provider: enabled.
- Magic link only (OTP / password flows not required).

---

## 4. Database schema

All required SQL lives in [supabase/migrations/](supabase/migrations/) and
runs in order. Apply it with:

```bash
# Hosted project (recommended once linked):
npx supabase db push

# Local:
npx supabase db reset      # wipes + reapplies everything
```

Migrations (already authored):

| File | Purpose |
| --- | --- |
| 00001_create_users.sql | Operator user profiles |
| 00002_create_engagements.sql | Engagement records |
| 00003_create_documents.sql | Uploaded docs + parse status |
| 00004_create_document_requirements.sql | Required document taxonomy |
| 00005_create_pre_analyses.sql | AI pre-analysis runs |
| 00006_create_scores.sql | 6-dimension scoring |
| 00007_create_benchmark_cases.sql | Pattern library anchors |
| 00008_create_pattern_matches.sql | Similarity matches |
| 00009_create_reports.sql | Generated reports |
| 00010_create_audit_log.sql | Append-only audit trail |
| 00011_create_prompt_versions.sql | Versioned prompts |
| 00012_rls_policies.sql | Row-level security policies |
| 00013_seed_document_requirements.sql | Seed requirement taxonomy |
| 00014_seed_benchmark_cases.sql | Seed 10 benchmark cases |

---

## 5. Storage buckets

Kaptrix stores uploaded documents and generated report PDFs in Supabase
Storage. Create these buckets (Project → Storage → New bucket):

| Bucket | Visibility | Purpose |
| --- | --- | --- |
| `engagement-documents` | Private | Source documents (PDF/DOCX/XLSX/PPTX) |
| `reports` | Private | Generated report PDFs |

Both buckets should be **Private** — access goes through Supabase auth + RLS.

Recommended bucket policies (SQL, Storage → Policies):

```sql
-- engagement-documents: authenticated users can read/write files they own
create policy "Operators read own docs"
  on storage.objects for select
  using ( bucket_id = 'engagement-documents' and auth.role() = 'authenticated' );

create policy "Operators write own docs"
  on storage.objects for insert
  with check ( bucket_id = 'engagement-documents' and auth.role() = 'authenticated' );

-- reports: read-only for authenticated users; writes happen server-side only
create policy "Operators read reports"
  on storage.objects for select
  using ( bucket_id = 'reports' and auth.role() = 'authenticated' );
```

Tighten further with engagement-scoped checks when you move to multi-tenant.

---

## 6. Row-level security (RLS)

Migration [00012_rls_policies.sql](supabase/migrations/00012_rls_policies.sql)
enables RLS on all operator tables. Confirm after `db push`:

- In Supabase → Authentication → Policies, every table should show
  "RLS enabled".
- Anonymous (`anon`) role should have **no** direct table access.

The `service_role` key bypasses RLS and is only used server-side in
[src/app/api/**](src/app/api/).

---

## 7. Extensions

The benchmark pattern-matching feature uses `pgvector`. Enable it in
Supabase → Database → Extensions:

- `pgvector` — required for embedding similarity.
- `uuid-ossp` — usually on by default.

If `pgvector` is not enabled before migrations run, re-run:

```bash
npx supabase db push
```

---

## 8. Sanity checklist

Before switching the app off preview / mock data:

- [ ] `.env.local` has real `NEXT_PUBLIC_SUPABASE_URL` and keys.
- [ ] `npm run dev` boots without env warnings.
- [ ] `/login` accepts your email and sends a magic link.
- [ ] Clicking the email link lands you on `/engagements`.
- [ ] Supabase dashboard shows your user in Authentication → Users.
- [ ] Tables listed in section 4 are all present under Database → Tables.
- [ ] `engagement-documents` and `reports` buckets exist under Storage.

---

## 9. What Kaptrix does **not** need (so you don't over-configure)

- No realtime channels (yet).
- No edge functions (yet — report PDF generation runs inside Next.js).
- No Supabase Auth social providers.
- No custom JWT claims.

Keep the project minimal until those features are explicitly wired up.
