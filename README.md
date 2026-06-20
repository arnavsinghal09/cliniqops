# CliniqOps

CliniqOps is a full-stack clinic operations platform that combines revenue analytics, AI-powered clinical documentation, and telehealth in a single product. It is built for multi-clinic SaaS deployments with hard tenant isolation, role-based access, and an AI layer (Gemini 2.5 Flash + AssemblyAI) for both natural-language data queries and ambient consultation scribing.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Environment variables](#environment-variables)
5. [Local setup](#local-setup)
6. [Authentication](#authentication)
7. [Role-based access control](#role-based-access-control)
8. [Database schema](#database-schema)
9. [Dashboard & KPIs](#dashboard--kpis)
10. [CSV Upload](#csv-upload)
11. [Natural-language query](#natural-language-query)
12. [Consultations & AI Scribe](#consultations--ai-scribe)
13. [Patient management](#patient-management)
14. [Revenue leakage detection](#revenue-leakage-detection)
15. [Anomaly detection & alerts](#anomaly-detection--alerts)
16. [Product tour](#product-tour)
17. [Landing page](#landing-page)
18. [Demo credentials](#demo-credentials)

---

## What it does

| Module | What it solves |
|---|---|
| **Dashboard** | Real-time KPIs (revenue, no-show rate, unbilled visits, appointment count) with four drill-down charts |
| **Revenue Integrity** | Detects under- and over-coded appointments by comparing billed CPT codes to actual visit duration; surfaces leakage per doctor and month |
| **Natural-language Query** | Converts plain-English clinic questions to parameterised PostgreSQL via Gemini, executes against a read-only RPC, and renders a bar chart, line chart, or table |
| **CSV Upload** | Ingests scheduling exports from any EHR (Athena, DrChrono, generic) with flexible header normalisation and idempotent upsert |
| **Consultations / Scribe** | Full WebRTC telehealth with Supabase Realtime signalling + an ambient AI scribe (AssemblyAI v3 streaming) that generates a structured SOAP note via Gemini on call end |
| **Patients** | Searchable roster with follow-up status, visit timeline, ICD-10 codes, and inline note logging |
| **Alerts** | Weekly anomaly detection across four metrics; HIGH-severity anomalies trigger email digests to admins via Resend |
| **Settings** | Account profile, team management, clinic invite system |
| **Product Tour** | 21-step interactive guided walkthrough with DOM spotlight and localStorage-persisted progress |

---

## Tech stack

### Core framework

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.9 (App Router, React 19) |
| Language | TypeScript 5 throughout |
| Styling | Tailwind CSS v4 (utility classes + CSS custom properties for design tokens) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Toasts | Sonner |
| UI primitives | Radix UI / shadcn |

### Data & persistence

| Layer | Choice |
|---|---|
| ORM | Prisma 7 with `prisma-client` generator (output to `lib/generated/prisma`) |
| Database | PostgreSQL via Supabase |
| DB adapter | `@prisma/adapter-pg` for the edge-compatible driver |
| Realtime & read-only RPC | Supabase JS client (Realtime Broadcast for WebRTC signalling; `execute_readonly_query` RPC for NL query execution) |

### Authentication

| Layer | Choice |
|---|---|
| Auth library | NextAuth v5 (beta 31) |
| Strategy | `CredentialsProvider` with bcrypt password verification |
| Session transport | JWT (no server-side session table needed for auth; the DB `Session` model is kept for NextAuth compatibility) |
| Adapter | `@auth/prisma-adapter` wires NextAuth to the Prisma models |

### AI

| Service | Used for |
|---|---|
| Google Gemini 2.5 Flash (`@google/generative-ai`) | NL → SQL translation (with few-shot prompting) and SOAP note generation from consultation transcripts |
| AssemblyAI v3 Streaming | Real-time speech-to-text during consultations; partial transcripts streamed over WebSocket |

### Other services

| Service | Used for |
|---|---|
| Resend | Transactional HTML emails for anomaly digests |
| Vercel Cron | Weekly anomaly detection job (`/api/cron/anomaly`) |

### Charts

Recharts (`BarChart`, `LineChart`, responsive containers) rendered client-side from server-computed data.

---

## Repository layout

```
cliniqops/
├── app/
│   ├── (dashboard)/          # Authenticated shell (layout.tsx wraps every route)
│   │   ├── dashboard/        # KPI page
│   │   ├── upload/           # CSV ingestion
│   │   ├── query/            # NL query interface
│   │   ├── consultations/    # Telehealth + scribe
│   │   ├── patients/         # Patient roster
│   │   ├── revenue/          # Leakage report
│   │   ├── alerts/           # Anomaly feed
│   │   ├── settings/         # Account & team
│   │   ├── layout.tsx        # Dashboard shell (auth guard + sidebar + ProductTour mount)
│   │   └── actions.ts        # Shared server actions (date-filter helpers, etc.)
│   ├── api/
│   │   ├── consultation/[roomToken]/  # Public room metadata + followup-request
│   │   ├── cron/anomaly/              # Weekly cron handler
│   │   ├── revenue/export/            # CSV export
│   │   └── upload/appointments/       # CSV import
│   ├── consultation/[roomToken]/      # Public patient-facing consultation room
│   │   └── report/                    # Post-visit SOAP report for patient
│   ├── login/                         # Login page
│   ├── page.tsx                       # Landing page
│   └── layout.tsx                     # Root layout (fonts, themes, Sonner)
│
├── components/
│   ├── charts/               # Recharts wrappers (NoShow, Revenue, Cancellation, Duration, Unbilled, Leakage)
│   ├── dashboard/            # KpiCards
│   ├── landing/              # Hero, Features, FlowSection, MetricsBand, etc.
│   ├── patients/             # PatientFilter, Pagination
│   ├── ui/                   # shadcn primitives (Button, Dialog, Sheet, etc.)
│   ├── ui-kit/               # Custom primitives (CountUp, DrawBorder, LayeredCard, MetricCard, SectionLabel)
│   ├── upload/               # UploadForm
│   ├── demo/                 # DemoLoginButton (auto-fills credentials)
│   ├── AlertToastListener.tsx   # Supabase Realtime → toast bridge
│   ├── CreateUserForm.tsx
│   ├── PatientDrawer.tsx
│   ├── RoleSelect.tsx
│   ├── sidebar.tsx
│   └── topbar.tsx
│
├── lib/
│   ├── generated/prisma/     # Auto-generated Prisma client (do not hand-edit)
│   ├── queries/              # Server-only data access (kpi, patients, revenue, alerts, scope, scribe)
│   ├── tour/                 # ProductTour.tsx + tourConfig.ts + TakeTourButton.tsx
│   ├── email/                # anomaly-digest.ts (Resend HTML template)
│   ├── demo/credentials.ts   # Demo clinic credentials constant
│   ├── anomaly-detection.ts  # Metric aggregation + median baseline + severity + upsert
│   ├── audit.ts              # AuditLog writer
│   ├── authz.ts              # requireRole() + appointmentScope() + patientScope()
│   ├── cpt-reference.ts      # CPT E/M codes table + leakage calculation
│   ├── gemini.ts             # Gemini model factory (server-only)
│   ├── motion.ts             # Framer Motion shared variants
│   ├── permissions.ts        # Role → allowed routes map + canAccess()
│   ├── prisma.ts             # Prisma singleton
│   ├── soap.ts               # Gemini SOAP generation (transcript → JSON)
│   ├── supabase-admin.ts     # Service-role Supabase client (server-only)
│   └── utils.ts              # cn() helper
│
├── prisma/
│   ├── schema.prisma         # Single source of truth for the DB schema
│   └── seed.ts               # Demo clinic seed (Sunrise Medical)
│
├── scripts/
│   └── generate-csv.ts       # Helper to generate sample appointment CSVs
│
├── types/                    # next-auth.d.ts augmentation (role, clinicId, etc.)
├── auth.ts                   # NextAuth config with PrismaAdapter + CredentialsProvider
├── auth.config.ts            # Edge-safe config (JWT + session callbacks only)
├── prisma.config.ts          # Prisma config with pg adapter
└── vercel.json               # Cron schedule declaration
```

---

## Environment variables

Create a `.env.local` at the repo root. All variables are required unless noted optional.

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://...           # Supabase connection string (with pgbouncer for prod)

# Supabase (used for Realtime signalling + read-only RPC)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...   # anon/public key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # service role key (server-only)

# NextAuth
AUTH_SECRET=<random 32-byte hex>              # openssl rand -hex 32
NEXTAUTH_URL=http://localhost:3000            # full URL (required in prod)

# AI
GEMINI_API_KEY=AIza...                        # Google AI Studio key
ASSEMBLYAI_API_KEY=...                        # AssemblyAI API key

# Email (Resend)
RESEND_API_KEY=re_...

# Cron security (any random string; must match Authorization header in Vercel Cron)
CRON_SECRET=dev-secret-change-me
```

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see above)
cp .env.example .env.local   # then fill in values

# 3. Push schema & run migrations
npx prisma migrate dev

# 4. Seed the demo clinic
npm run db:seed

# 5. Start the dev server
npm run dev

# Optional: open Prisma Studio
npm run db:studio

# Optional: manually trigger the anomaly cron
npm run cron:local
```

The seed creates a clinic with slug `sunrise`, five doctors, a billing user, and ~200 synthetic appointments spanning six months.

---

## Authentication

CliniqOps uses a split-config NextAuth v5 setup to satisfy both the Node.js runtime (where bcrypt and Prisma run) and the Edge runtime (where the middleware needs to read the JWT without Node APIs).

### Files

- **`auth.config.ts`** — Edge-safe. Contains only the JWT and session callbacks. No providers. Satisfies `NextAuthConfig`.
- **`auth.ts`** — Node.js only. Spreads `authConfig`, attaches `PrismaAdapter(prisma)`, and registers the single `CredentialsProvider`.

### Sign-in flow (step by step)

1. The user submits the login form with `email`, `password`, and `clinicSlug`.
2. `CredentialsProvider.authorize()` runs server-side:
   - Looks up `Clinic` by `slug`. Returns `null` if not found (no indication of whether clinic or user was wrong — intentional).
   - Looks up `User` by `email` scoped to `clinic.id`. Returns `null` if not found.
   - Compares the submitted password against `user.passwordHash` using `bcrypt.compare`. Returns `null` on mismatch.
   - On success, returns a plain object with `id`, `email`, `name`, `role`, `clinicId`, and `clinicName`.
3. NextAuth calls the `jwt` callback. The object from `authorize()` arrives as the `user` parameter. The callback copies `role`, `clinicId`, and `clinicName` onto the JWT token.
4. The `session` callback transforms the token into `session.user` (adding `id` from `token.sub`).
5. Every subsequent request reads `session.user.role` and `session.user.clinicId` from the JWT — zero DB round-trips on auth checks.

### Session strategy

`strategy: "jwt"` — no database session lookup on every request. The JWT is stored in an HttpOnly cookie and verified with `AUTH_SECRET`.

### Auth guards

- **Dashboard layout** (`app/(dashboard)/layout.tsx`) — calls `auth()` and redirects to `/login` if the session is absent.
- **Server actions and API routes** — each calls `auth()` independently and re-validates role/clinicId from the session (never from request body or query params).
- **`lib/authz.ts`**:
  - `requireRole(allowed)` — asserts role membership, redirects to `/dashboard` on failure.
  - `appointmentScope(session)` — returns a Prisma `where` clause. For `DOCTOR` role it additionally filters `doctorId = session.user.id` so a doctor never sees another doctor's appointments.
  - `patientScope(session)` — same pattern for patients.

---

## Role-based access control

Three roles exist in the `Role` enum: `ADMIN`, `DOCTOR`, `BILLING`.

### Route permissions (`lib/permissions.ts`)

```
ADMIN   → /dashboard  /upload  /patients  /query  /revenue  /alerts  /consultations  /settings
DOCTOR  → /dashboard  /patients  /query  /consultations  /alerts
BILLING → /dashboard  /revenue  /alerts  /upload
```

`canAccess(role, pathname)` does a prefix match. The middleware calls this function to enforce permissions at the routing layer.

### Data scoping (`lib/authz.ts`)

Even when a route is accessible, query results are further scoped:

- `ADMIN` and `BILLING` see all clinic data (appointments from every doctor, all patients).
- `DOCTOR` sees only their own appointments and only patients who have an appointment with them.

This scoping is enforced at the query layer via Prisma `where` clauses, not via UI hiding. A `DOCTOR` cannot retrieve another doctor's records by manipulating URLs.

---

## Database schema

The schema lives in `prisma/schema.prisma`. Key design decisions:

- Every model has a `clinicId` foreign key. All queries include `clinicId` in the `WHERE` clause. A single Supabase cluster serves multiple clinics with row-level isolation enforced in the application layer.
- `User.email` is unique per clinic (`@@unique([email, clinicId])`), not globally, so the same email can exist across clinics.
- `Appointment` has a compound unique key `(clinicId, patientId, appointmentDate, doctorId)` that makes CSV re-imports idempotent.

### Models at a glance

| Model | Purpose |
|---|---|
| `Clinic` | Root tenant. Has `slug` (URL-safe identifier used at login), `timezone`, optional `workingHoursJson` |
| `User` | Staff member. Has `role` (ADMIN/DOCTOR/BILLING), `status` (ACTIVE/SUSPENDED), `passwordHash`, `mustResetPassword` |
| `Invitation` | Pending team invite (token-based, has `expiresAt`) |
| `Patient` | Clinic patient. Stores `icd10Codes` as a `String[]`, `lastVisitDate` (maintained on import) |
| `Appointment` | Core clinical event. Tracks `status` (SCHEDULED/COMPLETED/CANCELLED/NO_SHOW), `durationMinutes`, `billedCptCode`, `billedAmount` |
| `FollowUpAction` | Free-text follow-up note logged by staff against a patient |
| `ConsultationRoom` | Telehealth room. Has `roomToken` (shared with patient), `status` (WAITING/ACTIVE/COMPLETED/CANCELLED), timestamps for each state transition |
| `ScribeSession` | Recording session attached to a room. Stores `rawTranscript`. One-to-one with `SoapNote` after Gemini processing |
| `SoapNote` | Structured SOAP note with `icd10Codes[]`, `suggestedCptCode`, `cptRationale`, `patientInstructions`, `prescriptions[]`, `followUpDate`, approval metadata |
| `SavedQuery` | A user-pinned NL query (question, generated SQL, chartType, rowCount) |
| `Alert` | Weekly metric anomaly record. Unique on `(clinicId, metric, weekOf)` so re-runs upsert rather than duplicate |
| `AuditLog` | Immutable log of actor + action + target |
| `Account`, `Session`, `VerificationToken` | NextAuth adapter tables (not used directly by app code) |

---

## Dashboard & KPIs

**Route:** `/dashboard` (server component)

The dashboard is fully server-rendered. Date range comes from `searchParams` (`startDate`, `endDate`); defaults to the last 30 days.

### KPI banner

A `LeakageHero` component at the top of the page computes revenue leakage inline and shows it prominently as the most actionable signal. Below it, `KpiCards` renders four metrics:

- **Total revenue** — sum of `billedAmount` for `COMPLETED` appointments
- **No-show rate** — `NO_SHOW / total` as a percentage
- **Unbilled visits** — `COMPLETED` appointments with `billedCptCode IS NULL`
- **Total appointments** — count for the period

### Charts grid (`data-tour="charts-grid"`)

Four server-fetched datasets drive four Recharts components:

| Chart | Query function | Visual |
|---|---|---|
| No-show rate by doctor | `getNoShowRateByDoctor` | Horizontal bar |
| Revenue by appointment type | `getRevenueByAppointmentType` | Horizontal bar |
| Cancellation rate by weekday | `getCancellationRateByWeekday` | Bar (Mon–Sun) |
| Avg. session duration by doctor | `getAvgDurationByDoctor` | Horizontal bar |

All query functions in `lib/queries/kpi.ts` accept a `scope` object (`{ clinicId, doctorId? }`) and a date range, so the same functions power both the admin view (all doctors) and the doctor-scoped view.

---

## CSV Upload

**Route:** `/upload` | **API:** `POST /api/upload/appointments`

Only `ADMIN` users can upload. The route re-verifies `session.user.role === "ADMIN"` server-side regardless of UI guards.

### Header normalisation

All column headers are normalised at parse time:

```
"Patient Name" → patientname
"appointment_date" → appointmentdate
"Doctor-Email" → doctoremail
```

This makes the importer compatible with exports from Athena, DrChrono, and any generic scheduling system without requiring a mapping step.

### Expected columns

| Column (any case/separator) | Required | Notes |
|---|---|---|
| `patientname` | Yes | Used for find-or-create patient lookup |
| `appointmentdate` | Yes | Any format parseable by `new Date()` |
| `durationminutes` | Yes | Positive integer |
| `appointmenttype` | Yes | Free text |
| `status` | Yes | Case-insensitive match to SCHEDULED / COMPLETED / CANCELLED / NO_SHOW |
| `doctoremail` | Yes | Must match an existing `User.email` in the clinic |
| `dateofbirth` | No | Patient DOB |
| `icd10codes` | No | Pipe-delimited: `E11.9\|I10` |
| `billedcptcode` | No | CPT code string |
| `billedamount` | No | Decimal |

### Processing pipeline

1. Parse entire CSV in memory with PapaParse (fine for typical EHR exports of a few hundred KB).
2. For each row: validate required fields → resolve doctor ID (cached per email to avoid N queries for the same 5 doctors appearing across 200 rows) → find-or-create patient → update `Patient.lastVisitDate` if this appointment is newer → upsert `Appointment` on the compound unique key.
3. Return `{ imported, skipped, errors: [{ row, reason }] }`. A partial import returns HTTP 200 — row failures are surfaced in the UI, not treated as a request failure.

---

## Natural-language query

**Route:** `/query` | **Server action:** `runNlQuery(question)` in `app/(dashboard)/query/actions.ts`

### Full pipeline

```
User types question
        ↓
Zod validates (min 1, max 500 chars)
        ↓
Gemini 2.5 Flash — system prompt + 8 few-shot pairs + question
        ↓
Strip markdown fences from response
        ↓
UNSAFE gate: if model returns exactly "UNSAFE", surface a safe error
        ↓
Safety validation (all three must pass):
  • Starts with SELECT (case-insensitive)
  • Contains the exact literal clinicId string in single quotes
  • No forbidden keywords (DROP/DELETE/UPDATE/INSERT/TRUNCATE/ALTER/CREATE/GRANT/REVOKE)
    — checked with word boundaries so "createdAt" doesn't trip "CREATE"
        ↓
Execute via Supabase RPC: execute_readonly_query(query)
  (read-only Postgres function; cannot write)
        ↓
Inspect GROUP BY clause to suggest chart type:
  temporal grouping (date_trunc, EXTRACT DOW/month, to_char) → line
  any other GROUP BY → bar
  no GROUP BY → table
        ↓
Return rows + columns + sql + suggestedChartType to client
```

### System prompt design

The prompt embeds the literal `clinicId` UUID as a hard rule:

> Rule 1: The query MUST contain the exact substring `"clinicId" = '<uuid>'` in a WHERE clause.

This means Gemini must include the tenant filter or the safety validation rejects the query. It is a defense-in-depth measure: even if the model were somehow coerced into generating a query for another clinic, the validation layer would catch and reject it.

The prompt also provides the full schema (Appointment, Patient, User columns + types), CPT fee reference (99211–99215), and ICD-10 pattern hints (`E11%` for diabetes, etc.).

Eight few-shot examples cover the most common question types: no-show rate, diabetic patients, total revenue, cancellation by weekday, unbilled visits, average duration, month-over-month comparison, and patients not seen in 90 days.

### Client rendering

`NLQueryInterface` determines the view model from the returned rows and columns:

- **Hero** — single row, single numeric column → large stat display
- **Bar** — multiple rows, one category + one numeric, non-temporal → horizontal bar chart
- **Line** — same but temporal category key (month, day, week, etc.) → line chart
- **Table** — everything else, or >40 rows

Column formatting is detected by tokenising column names: `rate`/`pct`/`percent` → percentage suffix; `revenue`/`amount`/`billed` → currency prefix; `minutes`/`duration` → minutes suffix.

The SQL is collapsible below the result. Users can copy it, export results as CSV, or save a query (stored in `SavedQuery`) for quick re-run.

### Voice input

`VoiceInput.tsx` uses the Web Speech API (`webkitSpeechRecognition`) to populate the query box by speaking. On transcript completion it auto-submits.

---

## Consultations & AI Scribe

This is the most architecturally complex part of the system. It combines WebRTC for video, Supabase Realtime for signalling, AssemblyAI for live transcription, and Gemini for SOAP generation.

### Roles in a consultation

- **Doctor** (authenticated, in the dashboard at `/consultations`) — the caller/offerer in WebRTC.
- **Patient** (unauthenticated, following a shared link `/consultation/<roomToken>`) — the answerer.

### Room lifecycle

```
1. Doctor creates room (RoomManagementPanel)
   → ConsultationRoom created with status WAITING
   → roomToken generated (CUID)

2. Doctor shares link: /consultation/<roomToken>
   Patient visits the page (no auth required)
   Patient polls GET /api/consultation/<roomToken> every 5 seconds

3. Doctor clicks "Join" in RoomManagementPanel
   → ActiveSessionPanel.initiateTelehealth(roomId) runs
   → Doctor gets camera/mic access
   → RTCPeerConnection created
   → Supabase Realtime channel "consultation:<roomToken>" joined
   → startConsultation(roomId) server action sets room to ACTIVE

4. Patient's poll sees status = ACTIVE → joinCall() runs
   Patient joins the same Realtime channel
   Patient sends { type: "patient-joined" } broadcast

5. Doctor receives patient-joined broadcast → createOffer() → sends SDP offer
   Patient receives offer → createAnswer() → sends SDP answer
   Both sides exchange ICE candidates via the same Realtime channel
   WebRTC P2P connection established

6. Doctor can toggle AI Scribe ON at any point during the call:
   → getScribeToken() server action mints a short-lived (600s) AssemblyAI token
     (API key never reaches the browser)
   → WebSocket opened to wss://streaming.assemblyai.com/v3/ws
   → AudioContext samples microphone at 16000 Hz via ScriptProcessorNode
   → Raw 16-bit PCM frames sent over the WebSocket
   → AssemblyAI returns { type: "Turn", transcript, end_of_turn } messages
   → Partial text shown live; finalised segments appended on end_of_turn

7. Doctor clicks "End call":
   → endConsultation(roomId) sets room to COMPLETED
   → saveScribeTranscript() saves raw transcript as ScribeSession
   → WebRTC teardown; patient page transitions to "ended" state

8. Doctor sees SOAP editor in PastConsultationsPanel:
   → SoapEditor sends transcript to Gemini (generateSoapFromTranscript)
   → Gemini returns structured JSON: subjective, objective, assessment, plan,
     icd10Codes[], suggestedCptCode, cptRationale, patientInstructions,
     followUpDate (ISO date computed from relative mentions), prescriptions[]
   → Doctor reviews, edits inline, approves

9. Patient's post-call screen polls GET /api/consultation/<roomToken>
   → hasSoapNote flag becomes true when doctor approves
   → Patient can view /consultation/<roomToken>/report
   → Patient can submit a follow-up request (stored as FollowUpAction)
```

### WebRTC signalling architecture

CliniqOps uses Supabase Realtime Broadcast (not Presence, not Postgres changes) as the signalling transport. This keeps signalling costs near-zero (Broadcast doesn't hit the database) and gives sub-100ms message delivery.

STUN servers used: `stun.l.google.com:19302` and `stun1.l.google.com:19302`. No TURN server is configured, which means the connection may fail in highly restricted corporate network environments.

### Standalone scribe (no video)

The doctor can also use the scribe without a telehealth call. In "standalone" mode, the doctor selects a patient and appointment type, hits Record, and the scribe runs against just the microphone (in-person or phone consultation). The transcript is saved the same way and flows through the same SOAP generation pipeline.

### Gemini SOAP prompt

The system prompt instructs the model to:
- Output only valid JSON (no markdown fences, no preamble)
- Never fabricate — if a field cannot be inferred from the transcript, use `""` or `[]` or `null`
- Write `patientInstructions` in plain second-person language the patient can understand
- Suggest a single E/M CPT code (99211–99215) based on visit complexity with a one-sentence rationale
- Compute an ISO follow-up date from relative mentions like "come back in 2 weeks" using today's date
- Return a fixed JSON schema with exactly 10 keys

After generation, every field is defensively normalised: strings coerced with `String()`, arrays checked with `Array.isArray()`, `followUpDate` validated against `/^\d{4}-\d{2}-\d{2}/`.

---

## Patient management

**Route:** `/patients`

### Data access scoping

- `ADMIN` / `BILLING` see all patients in the clinic.
- `DOCTOR` sees only patients who have at least one appointment with them (`patientScope` adds `appointments: { some: { doctorId: session.user.id } }`).

### Features

- **Search** — name filter applied server-side via Prisma `contains` (case-insensitive).
- **Follow-up status** — derived from `lastVisitDate`:
  - GREEN: visited within 30 days
  - AMBER: 30–90 days
  - RED: >90 days or never visited
- **Patient drawer** (`PatientDrawer.tsx`) — slides in from the right. Shows full appointment history (date, type, status, CPT code, billed amount), ICD-10 codes, and a text area for logging follow-up notes (saved as `FollowUpAction`).
- **Pagination** — server-side cursor pagination with configurable page size.

---

## Revenue leakage detection

**Route:** `/revenue` | **Queries:** `lib/queries/revenue.ts` | **CPT logic:** `lib/cpt-reference.ts`

### CPT E/M reference table

```
99211  0–9 min    $24   Minimal
99212  10–19 min  $46   Low complexity
99213  20–29 min  $77   Moderate complexity
99214  30–39 min  $110  Moderate-high complexity
99215  40+ min    $148  High complexity
```

### Leakage calculation

For every `COMPLETED` appointment that has a `billedCptCode`:

1. Look up the CMS fee for the billed code.
2. Determine the suggested code from `durationMinutes` using the table above.
3. `leakageAmount = suggestedFee - billedFee`
4. If `leakageAmount > 0` → `UNDERCODE` (revenue lost, doctor billed below what the visit time warranted)
5. If `leakageAmount < 0` → `OVERCODE` (compliance risk, doctor billed above time)
6. If codes match → `CORRECT` (skipped)

### What the page shows

- Three headline metrics: total leakage amount (undercode only), undercode count, overcode count + how many doctors are affected.
- Bar chart: leakage by doctor (most to least).
- Line chart: 6-month monthly leakage trend. A badge appears if the last 3 months are strictly increasing.
- Full flagged appointments table with: date, doctor, patient, duration, billed code, suggested code, gap in ₹, and UNDERCODE / OVERCODE badge.
- CSV export button (`GET /api/revenue/export`).

---

## Anomaly detection & alerts

**Cron:** `GET /api/cron/anomaly` | **Logic:** `lib/anomaly-detection.ts` | **Email:** `lib/email/anomaly-digest.ts`

### Metrics monitored

| Metric key | SQL fragment |
|---|---|
| `noShowRate` | `COUNT(*) FILTER (WHERE status = 'NO_SHOW') / NULLIF(COUNT(*), 0)` |
| `cancellationRate` | `COUNT(*) FILTER (WHERE status = 'CANCELLED') / NULLIF(COUNT(*), 0)` |
| `totalRevenue` | `COALESCE(SUM(billedAmount) FILTER (WHERE status = 'COMPLETED'), 0)` |
| `unbilledCount` | `COUNT(*) FILTER (WHERE status = 'COMPLETED' AND billedCptCode IS NULL)` |

### Algorithm

For each clinic, for each metric:

1. Fetch weekly aggregated values for the current week plus the 12 prior weeks using `date_trunc('week', ...)` in a single raw SQL query.
2. Take the most recent value as `currentValue`.
3. Take the median of the up-to-12 prior weeks as `baselineValue`. Median is used (not mean) to resist outlier weeks from skewing the baseline.
4. Compute `deviationPercent = (current - baseline) / baseline × 100`.
5. Map to severity:
   - `|deviation| > 25%` → HIGH
   - `|deviation| > 15%` → MEDIUM
   - `|deviation| > 10%` → LOW
   - Otherwise → skip (no alert)
6. Upsert into `Alert` on the unique key `(clinicId, metric, weekOf)`. Existing `isRead` flags are deliberately preserved on re-runs so re-triggering the cron mid-week doesn't reset notifications.

### Email digest

When any clinic has HIGH-severity alerts, all ADMIN users for that clinic receive an HTML email via Resend:

- Branded HTML table with metric name, current value, baseline, deviation %, and colour-coded severity badge.
- Sent from `alerts@resend.dev` with subject `⚠ <clinicName> — <n> anomalies detected`.

### Cron schedule

Declared in `vercel.json`. Set to weekly. The handler requires `Authorization: Bearer <CRON_SECRET>` to prevent unauthenticated triggering. Run locally with `npm run cron:local`.

### In-app alerts feed

`/alerts` shows unread alerts first, then read. Each alert displays the metric name, week, deviation percentage, severity badge, and baseline vs current values. Alerts are marked read individually. The sidebar badge shows the total unread count (fetched in the dashboard layout on every navigation). `AlertToastListener.tsx` subscribes to Supabase Realtime Postgres changes on the `Alert` table for the current clinic and pops a toast when a new HIGH-severity alert is inserted.

---

## Product tour

**Files:** `lib/tour/ProductTour.tsx`, `lib/tour/tourConfig.ts`, `lib/tour/TakeTourButton.tsx`

The product tour is a 21-step interactive walkthrough of the entire application. It is mounted in the dashboard layout so it is available on every authenticated page.

### Step types

There are three step variants:

| Type | Behaviour |
|---|---|
| **ModalStep** (`targetSelector: null`) | Full-screen dimmed backdrop, tooltip centred. Used for intro and outro. |
| **NextStep** | Spots a DOM element with `targetSelector`, punches a hole in the overlay, positions the tooltip adjacent. Advances on "Next". |
| **ClickNavStep** | Same spotlight as NextStep, but the CTA reads "Take me there →" and on click programmatically navigates to `navigatesTo` and advances to the next step. |

### Spotlight mechanics

`ProductTour` polls the DOM for the `targetSelector` via `document.querySelector` at 100ms intervals for up to 4 seconds after a route change. Once found, it reads `getBoundingClientRect()` and renders a `motion.div` with:

```css
box-shadow: 0 0 0 9999px rgba(26,23,20,0.55);
```

This is the classic cutout overlay trick: the element itself is visible through the hole, and a pulsing `outline` (animated with Framer Motion `scale: [1, 1.04, 1]`) draws attention to it. On scroll and resize the rect is re-read and the spotlight animates to follow via a spring transition.

### Tour trigger

- **URL param** — appending `?tour=1` to any dashboard URL starts the tour from step 1. Used by the landing page CTA.
- **Custom event** — `window.dispatchEvent(new CustomEvent('cliniqops:start-tour', { detail: { resumeStep? } }))` starts or resumes the tour from JS anywhere.
- **`TakeTourButton`** — renders in the topbar; dispatches the event and can resume from a saved step.

### State persistence

- `cliniqops_tour_completed` — `localStorage` key set when the user finishes all 21 steps.
- `cliniqops_tour_paused_step` — `localStorage` key set when the user dismisses mid-tour. On re-entry, `TakeTourButton` reads this and offers to resume.

### Navigation between steps

When advancing to a step on a different route, `ProductTour` calls `router.push(step.routePath)`. For `ClickNavStep`, the tour also programmatically clicks the target element (the nav link) before pushing the route so the sidebar active state updates correctly.

### Viewport guard

Below 1024px the tour shows a "Best viewed on desktop" modal and offers a dismiss button. The spotlight overlay is not rendered at all.

### Tour steps summary

| Steps | Route | Focus |
|---|---|---|
| 1 | /dashboard | Welcome modal |
| 2–5 | /dashboard | Revenue banner → leakage card → KPI cards → charts grid |
| 6 | /dashboard → /query | Navigation to NL Query |
| 7–8 | /query | Query input → example chips |
| 9 | /query → /upload | Navigation to Upload |
| 10 | /upload | Upload dropzone |
| 11 | /upload → /consultations | Navigation to Consultations |
| 12 | /consultations | Start a video visit |
| 13 | /consultations → /patients | Navigation to Patients |
| 14–15 | /patients | Patient table → patient drawer |
| 16 | /patients → /revenue | Navigation to Revenue |
| 17–18 | /revenue | Leakage summary → trend chart |
| 19 | /revenue → /alerts | Navigation to Alerts |
| 20 | /alerts | Alerts feed |
| 21 | /alerts | Finish modal |

---

## Landing page

**Route:** `/` (`app/page.tsx`)

The marketing landing page is a server component. Sections:

- `LandingNav` — sticky top navigation with login link and "Take a tour" CTA (links to `/dashboard?tour=1`)
- `Hero` — headline with animated CountUp metrics and primary CTA
- `MetricsBand` — four key outcome stats with animated counters
- `ManifestoBand` — product philosophy statement
- `Features` — feature grid
- `FlowSection` / `FlowBoard` — visual walkthrough of the workflow
- `LayeredCards` — depth-layered card stack (Framer Motion)
- `TrustStrip` — social proof
- `CTA` — conversion section with Demo Login button
- `Footer`

`DemoLoginButton` auto-fills the login form with the demo credentials and submits, getting users into the app in one click without manual typing.

---

## Demo credentials

The seed creates a single demo clinic:

| Field | Value |
|---|---|
| Clinic slug | `sunrise` |
| Email | `admin@sunrise.com` |
| Password | `password123` |
| Role | `ADMIN` |

Defined in `lib/demo/credentials.ts` and used by `DemoLoginButton` for the landing page one-click login.
