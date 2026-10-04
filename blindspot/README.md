

# Blindspot

**See what your reasoning might be missing.** Blindspot helps you examine a decision by surfacing the assumptions, gaps and tensions in your own reasoning. It helps you think. It never decides for you.

Built for PROMPTWARS 2026, "The Blind Spot".

## Problem

People decide using the information most visible to them. They miss unstated assumptions, overlook relevant factors, and don't notice conflicts in their own reasoning.

## Solution

You describe a decision, the context, and why you're leaning the way you are. Blindspot returns a structured report: what you seem to be prioritizing, assumptions to test, factors you may have overlooked, evidence worth gathering, tensions in your reasoning, other viewpoints, and open questions. You then write your own reflections. The report ends with *"The decision remains yours."*

## Features

- Short form with validation, character counters and a one-click example
- Gemini returns a schema-validated JSON report, with one retry for invalid output
- Report sections appear only when relevant (no forced contradictions)
- Reflection prompts with in-tab notes, plus copy-to-clipboard of report and notes
- Loading, error and retry states; nothing is stored
- A verdict guard rejects model output that reads like a recommendation

## How AI is used

Gemini does the actual reasoning. A fixed system instruction makes it a neutral facilitator: tie findings to what the user said, separate facts from assumptions, use tentative language, state uncertainty, never recommend. The user's text is passed as JSON-encoded, untrusted data. The server validates the response against a zod schema and runs a phrase guard for verdict language. If either check fails it retries once, then shows a friendly error.

## Google technologies

- **Gemini API** via the official `@google/genai` SDK (default model `gemini-3.1-flash-lite`, override with `GEMINI_MODEL`). It is the core analysis engine.
- **Google Cloud Run** for hosting (see Deployment). Any Node host also works.

## Tech stack

Next.js (App Router), TypeScript, zod, plain CSS, Vitest.

## Architecture

```text
Browser form --POST /api/analyze--> Route handler
   size cap -> JSON parse -> zod validation -> per-IP rate limit
  -> Gemini (system instruction + untrusted data block, JSON mode, 40s timeout)
   -> parse + zod validate + verdict guard (one retry)
Browser <-- { report } -- rendered as plain text by React
```

```text
src/app/api/analyze/route.ts   API route (validation, limits, error mapping)
src/lib/schema.ts              input and report schemas (zod)
src/lib/prompt.ts              system instruction and prompt builder
src/lib/gemini.ts              Gemini call, parsing, retry
src/lib/guard.ts               verdict-language detector
src/lib/rateLimit.ts           sliding-window limiter
src/components/                DecisionForm, Report, Logo
tests/                         Vitest suites
```

## Security

- `GEMINI_API_KEY` is read only on the server. It is not `NEXT_PUBLIC_`, not in the client bundle, and `.env*` is git-ignored.
- Inputs are validated on client and server with length caps; request bodies over 12 KB are rejected.
- Prompt injection: fixed system instruction, user text JSON-encoded inside a labeled untrusted block, output constrained to a schema, no tools or URLs given to the model.
- AI output is rendered as React text only (no `dangerouslySetInnerHTML`).
- Errors returned to the client are generic; user content is never logged.
- CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` headers are set. The CSP allows inline scripts, which Next.js needs without nonces.
- Rate limit: 10 requests per 10 minutes per IP, held in memory. It is per instance, so it is a basic abuse guard, not a hard quota.

## Running locally

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # unit tests
npm run typecheck
npm run build && npm start   # production mode
```

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Key from https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | no | Override the default Gemini model |

## Deployment (Cloud Run)

Create a Secret Manager secret named `gemini-api-key` containing your Gemini API key, and grant the Cloud Run service identity access to it. Then deploy from this directory (replace `us-central1` with your region):

```powershell
gcloud config set project YOUR_PROJECT_ID
gcloud run deploy blindspot --source . --region us-central1 `
  --allow-unauthenticated --max-instances 2 `
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest `
  --set-env-vars GEMINI_MODEL=gemini-3.1-flash-lite
```

This command makes the service public. The included `Dockerfile` builds Next.js standalone output and listens on port 8080. The in-memory rate limiter is per instance, so `--max-instances 2` does not create a global quota.

## Testing

`npm test` runs 47 tests: input and output schemas, verdict guard, parse/retry logic, prompt-injection containment, rate limiter, and the API route with Gemini mocked (validation, oversize, malformed JSON, hidden errors, 429). Manual checklist: empty and over-long input, API failure, mobile width, keyboard-only navigation.

## Verified

- `npm test` (47 tests), `npm run typecheck` and `npm run build` pass.
- Live analyze endpoint with Gemini: the internship example returns a schema-valid report.
- The API rejects invalid input with field-level errors, returns generic errors to the client, and sets security headers.
- The Gemini key does not appear in the client bundle.

## Limitations and future improvements

- The in-memory rate limiter does not share state across instances.
- The IP-based limit is best-effort; use managed edge rate limiting and budget alerts before a broad public launch.
- Analysis quality depends on the model and on how much the user shares.
- A follow-up pass that re-checks the report against the user's reflection answers.
- Automated end-to-end and axe accessibility tests.
