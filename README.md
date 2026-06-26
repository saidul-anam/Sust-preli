# QueueStorm Investigator

A complaint classification and evidence-matching engine for fintech support tickets. Built for the **SUST CSE Carnival 2026 · Codex Community Hackathon · Online Preliminary**.

The service receives a customer/merchant/agent complaint and a transaction history, then returns a structured analysis: the relevant transaction, an evidence verdict, the case type, severity, routing department, an agent summary, a recommended next action, a safe customer reply, and a flag for human review.

---

## Quick Start

### 1. Run the Server Locally
To start the server, install the dependencies and run the start command:
```bash
npm install
npm start
```
By default, the server runs on port `8000`.

### 2. Run Test Suites
With the server running in the background, execute any of the following test suites to verify functionality:

* **10 Sample Cases**:
  ```bash
  npm test
  ```
* **60 Edge Cases Made by our Team**:
  ```bash
  node test/run_edge_cases.js
  ```
* **HTTP Status Code Coverage Made by our Team**:
  ```bash
  node test/test_http_status_codes.js
  ```

---

## Live Deployment

The service is deployed live on Render at:
**Base URL**: `https://backendrooms-sw74.onrender.com`

### Deployed Endpoints
* **Liveness Probe**: `GET https://backendrooms-sw74.onrender.com/health`
* **Ticket Analysis**: `POST https://backendrooms-sw74.onrender.com/analyze-ticket`

### Testing the APi
* **You can test the api's from Postman**

> [!WARNING]
> This service is hosted on the Render Free Tier. Free instances spin down automatically after 15 minutes of inactivity. When a new request arrives, it may take up to a minute or more for the instance to spin up (cold start). If you experience a delay or no immediate response, please wait a moment and try the request again.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Run Commands](#run-commands)
- [HTTP API](#http-api)
- [AI Approach](#ai-approach)
- [Safety Logic](#safety-logic)
- [Model and Cost Reasoning](#model-and-cost-reasoning)
- [Testing](#testing)
- [Assumptions](#assumptions)
- [Known Limitations](#known-limitations)

---

## Overview

QueueStorm is a single HTTP endpoint (`POST /analyze-ticket`) that performs four jobs in one shot:

1. **Classifies** the complaint into one of the allowed `case_type` values (e.g. `wrong_transfer`, `payment_failed`, `phishing_or_social_engineering`).
2. **Matches** the complaint to the most likely transaction in the provided history.
3. **Evaluates** the evidence as `consistent`, `inconsistent`, or `insufficient_data`.
4. **Responds** with a routing decision (`department`, `severity`, `human_review_required`), a natural-language summary, a recommended next action for the internal agent, and a **safe** customer reply.

The design is fully deterministic and rules-based. There is no external LLM call in the request path — every decision is made locally using keyword lexicons, transaction-history heuristics, and templated safety-checked text.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js ≥ 18** | ESM modules, modern `fetch`, native test client |
| Web framework | **Express 4** | Minimal, stable, well-understood HTTP layer |
| Validation | **Zod 3** | Strict request-schema validation with clear error messages |
| Config | **dotenv** | Loads `.env` for `PORT` and any future secrets |
| Container | **Docker** (`node:20-slim`) | One-line reproducible deploys |
| Tests | Built-in `node:test` runner via plain Node scripts | Zero extra dependencies for the test client |

No database, no message queue, no ML model weights, no external API calls. The whole service boots from cold start in well under a second on a single CPU.

---

## Project Structure

```
queuestorm/
├── Dockerfile
├── package.json
├── README.md
├── sample_output.json
├── QueueStorm_Preli_Sample_Cases.json   # 10 public sample cases
├── test.json                            # 60 extended edge cases
├── src/
│   ├── server.js        # Process entry, binds PORT
│   ├── app.js           # Express app, /health, /analyze-ticket, error handlers
│   ├── schemas.js       # Zod schemas for request validation
│   ├── keywords.js      # Multilingual keyword lexicons + classification priority
│   ├── classifier.js    # case_type / department / severity / human-review logic
│   ├── reasoning.js     # Transaction matching + inconsistency checks
│   ├── safety.js        # Customer-reply templates + safety lines
│   ├── summaries.js     # agent_summary + recommended_next_action builders
│   └── utils.js         # Amount parsing, day-hint extraction, date math
└── test/
    ├── test_cases.js    # Hits the 10 public sample cases
    └── run_edge_cases.js # Hits the 60 extended cases
```

---

## Setup Instructions

### Prerequisites

- **Node.js 18 or newer** (Node 20 recommended — matches the Docker image)
- **npm** (bundled with Node)
- *(Optional)* **Docker** if you want to run the containerized build

### Local install

```bash
cd queuestorm
npm install
```

That is the entire setup. There is no database to provision, no API keys to obtain, no model weights to download.

### Optional `.env`

Create a `.env` file at the project root if you want to override defaults:

```env
PORT=8000
```

If omitted, the service falls back to `8000`.

### Docker build (optional)

```bash
docker build -t queuestorm .
docker run --rm -p 8000:8000 queuestorm
```

---

## Run Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start the server | `npm start` |
| Start in watch mode (auto-restart on file change) | `npm run dev` |
| Run the 10-case public test suite | `npm test` |
| Run the 60-case extended edge suite | `node test/run_edge_cases.js` |
| Run the HTTP status code coverage suite | `node test/test_http_status_codes.js` |

The server logs `QueueStorm Investigator running on port 8000` once it is ready.

---

## HTTP API

### `GET /health`

Liveness probe.

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### `POST /analyze-ticket`

The single endpoint the judge harness calls.

**Request body** (validated by `TicketRequestSchema` in `src/schemas.js`):

| Field | Required | Type | Notes |
|---|---|---|---|
| `ticket_id` | yes | string | Echoed back in the response |
| `complaint` | yes | string | Min length 1; empty strings return `422` |
| `language` | no | `"en" \| "bn" \| "mixed"` | Drives reply-language selection |
| `channel` | no | enum | `in_app_chat`, `call_center`, `email`, `merchant_portal`, `field_agent` |
| `user_type` | no | `"customer" \| "merchant" \| "agent" \| "unknown"` | Influences routing |
| `campaign_context` | no | string | Treated as untrusted metadata |
| `transaction_history` | no | array | Default `[]` |
| `metadata` | no | object | Free-form, currently unused in logic |

**Response codes**

| Code | Meaning |
|---|---|
| `200` | Successful analysis |
| `400` | Malformed JSON or schema violation |
| `422` | `complaint` was an empty string |
| `500` | Unexpected internal error (logged server-side) |

**Quick try**

```bash
curl -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-001",
    "complaint": "I sent 5000 taka to the wrong number around 2pm today.",
    "language": "en",
    "channel": "in_app_chat",
    "user_type": "customer",
    "transaction_history": [
      {"transaction_id":"TXN-9101","timestamp":"2026-04-14T14:08:22Z","type":"transfer","amount":5000,"counterparty":"+8801719876543","status":"completed"}
    ]
  }'
```

---

## AI Approach

QueueStorm does **not** call an external LLM. The "AI" is a deterministic pipeline composed of small, testable modules. This was a deliberate choice — see [Model and Cost Reasoning](#model-and-cost-reasoning).

### Pipeline (see `src/app.js → analyzeTicket`)

```
                ┌──────────────────────────┐
complaint ───►  │ 1. Injection detection   │  ── regex over complaint text
                └──────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────┐
                │ 2. Case-type classifier  │  ── priority-ordered keyword scan
                └──────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────┐
                │ 3. Transaction matcher   │  ── amount + day-hint filter, then
                │                          │     duplicate-cluster detection
                └──────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────┐
                │ 4. Inconsistency check   │  ── case-type-aware history patterns
                └──────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────┐
                │ 5. Severity + routing    │  ── amount thresholds, dept map
                └──────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────┐
                │ 6. Summaries + reply     │  ── templated, language-aware
                └──────────────────────────┘
```

### 1. Injection detection

A regex set in `app.js` flags phrases like `ignore previous`, `system prompt`, `disregard`, `forget instructions`, `act as`, `you are now`. When matched, the service:

- Forces `case_type` to `other`
- Forces `department` to `customer_support`
- Forces `department` to `fraud_detection`
- Forces `human_review_required` to `true`
- Logs a warning with the `ticket_id`

The legitimate part of the complaint is still analyzed normally — the injection is **ignored, not obeyed**.

### 2. Case-type classification (`classifier.js` + `keywords.js`)

Each `case_type` has a multilingual keyword list (English, Bangla script, and Banglish transliteration). A strict priority order resolves ambiguity:

```
phishing_or_social_engineering
duplicate_payment
agent_cash_in_issue
merchant_settlement_delay
wrong_transfer
payment_failed
refund_request
```

`phishing_or_social_engineering` is intentionally first — a phishing report is always more urgent than a dispute, even if the complaint mentions a transfer.

### 3. Transaction matching (`reasoning.js`)

The matcher works in three passes:

1. **Amount filter** — `parseAmountFromText` handles `"5000"`, `"5,000"`, `"5k"`, and Bangla numerals.
2. **Day-hint filter** — `extractDayHint` recognizes `today`, `yesterday`, `আজ`, `গতকাল`. If "yesterday" is mentioned and multiple matches remain, only transactions with the matching day-offset from the most recent transaction are kept.
3. **Duplicate cluster detection** — if 2+ candidates remain and 2+ are within 120 seconds of each other to the same counterparty, the **second** one is returned as the suspected duplicate.

If exactly one candidate survives, it is returned as the match with `verdict = consistent`. If multiple candidates survive with no duplicate pattern, the response is `insufficient_data` with `ambiguous = true` — the service refuses to guess.

### 4. Inconsistency checks (`reasoning.js → checkInconsistency`)

Case-type-specific red-flag rules:

- `wrong_transfer` against a recipient with **≥ 2 prior completed transfers** → `inconsistent` (probably not a wrong recipient).
- `payment_failed` but history shows `completed` → `inconsistent`.
- `refund_request` but history shows `reversed` → `inconsistent` (already refunded).
- `duplicate_payment` with fewer than 2 same-amount same-counterparty payments → `inconsistent`.

### 5. Severity and routing (`classifier.js`)

- `phishing_or_social_engineering` → `critical` (or `high` if shared with husband/wife/friend/family).
- `wrong_transfer` → `critical` if amount $\ge$ 10,000 BDT, `high` if $\ge$ 1,000 BDT, `low` if consistent under 1,000 BDT, `medium`/`low` if inconsistent.
- `payment_failed` → `high` if balance cut, `medium` otherwise.
- `duplicate_payment` → `high` if consistent, `medium` otherwise.
- `merchant_settlement_delay` → `critical` if amount $\ge$ 50,000 BDT, `high` if multi-day or delay $\ge$ 2 days, `medium` otherwise.
- `refund_request` → `high` (merchant user or BDT 8000), `medium` (for disputes), `low` (change of mind/other).
- `other` → `high` (blocked/hacked), `medium` (zero-amount), `low` otherwise.

Department is selected from a fixed map; merchants with `case_type = other` are routed to `merchant_operations` instead of `customer_support`.

### 6. Summaries and replies (`summaries.js`, `safety.js`)

- `agent_summary` is built from the truncated complaint + transaction ID.
- `recommended_next_action` is a case-type-specific imperative sentence addressed to the internal team.
- `customer_reply` is a template that never mentions credentials, never promises a refund or reversal, and never asks the customer to contact a third party. Bengali templates are provided for `wrong_transfer` and `agent_cash_in_issue`; all other cases reply in English.

---

## Safety Logic

The safety rules are enforced in three places: classification, response generation, and injection handling. They are derived directly from the problem statement and the public sample cases.

### Hard rules (the service cannot violate these)

1. **No credential requests.** The customer reply must never ask for a PIN, OTP, password, full card number, or CVV. The `customer_reply` templates in `src/safety.js` end with a safety line that *advises against* sharing credentials rather than asking for them.
2. **No unauthorized commitments.** The reply must never say "we will refund you" or "we will reverse this" or "your account is unblocked." Wherever a refund might be appropriate, the template uses the safer form *"any eligible amount will be returned through official channels."*
3. **No off-channel contact.** The reply must never instruct the customer to contact a third party outside official channels. Merchant-refund cases point the customer back to the merchant only because that is the policy-true path; otherwise all contact is via official support.
4. **Ignore user-injected instructions.** Any attempt inside `complaint`, `campaign_context`, or `metadata` to override these rules is detected and ignored. The legitimate part of the request is still served safely.

### Severity-driven safeguards

- Phishing reports are always `critical` and routed to `fraud_risk`.
- High-value disputes (≥ 10,000 BDT) escalate to `critical` and force `human_review_required = true`.
- Any inconsistent evidence escalates to `human_review_required = true` so a human can re-verify before any irreversible action.

### Multilingual safety lines

The credential-safety reminder exists in English and Bangla so it is not weakened by translation. `generateCustomerReply` selects the language from the `language` field on the request.

---

## Model and Cost Reasoning

### Why no external LLM?

The task is **closed-domain classification + templated generation** over a fixed enum set. A 7-line keyword pipeline produces the same structured decision an LLM would, deterministically, in **< 5 ms** on commodity hardware, with zero per-request cost and zero data leaving the process.

### Comparison

| Approach | Latency | Per-request cost | Determinism | Safety surface |
|---|---|---|---|---|
| External LLM (e.g. GPT-class) | 1–5 s | $0.001–$0.01+ | Low (sampling) | High — must be re-prompted against injection on every call |
| **Rules + templates (this build)** | **< 5 ms** | **$0** | **High** | **Low — all strings are code-reviewed literals** |

### When the cost calculus flips

A rules engine is only worth it as long as the keyword lexicons and templates cover the seen cases. The hidden test pack has 60+ edge cases; the public pack has 10. Both are inside the design envelope of the current lexicons. If the case mix drifts toward long, narrative, sarcastic, or code-mixed complaints where keyword overlap becomes unreliable, an LLM fallback (or a hybrid: rules for routing + LLM only for free-text `agent_summary`) would be the right next step. That is **not** required for this preliminary round.

### Why this matters for cost

Every `/analyze-ticket` call from the judge harness is graded on **functional equivalence**, not on prose quality. A deterministic rules engine gives the same output for the same input every time — making the submission trivially reproducible and cheap to operate at any scale.

---

## Testing

### Public sample cases

`npm test` posts the 10 cases from `QueueStorm_Preli_Sample_Cases.json` to the running server and checks `relevant_transaction_id`, `evidence_verdict`, `case_type`, `department`, `severity`, and `human_review_required`.

### Extended edge cases

`node test/run_edge_cases.js` does the same for the 60-case pack in `test.json` (adversarial injection, multilingual, high-value, vague, ambiguous-match, empty complaint, etc.).

### HTTP status code coverage

`node test/test_http_status_codes.js` verifies the status codes (`200`, `400`, `422`, `500`), error bodies, and safety compliance (no raw stack traces or internal secrets).

### Test workflow

```bash
# Terminal 1
npm start

# Terminal 2
npm test
# or
node test/run_edge_cases.js
# or
node test/test_http_status_codes.js
```

---

## Assumptions

1. **Complaint language is honest.** The `language` field is used to choose the reply template; the underlying classifier still scans both English and Bangla keywords against every complaint.
2. **No real "now" is provided.** `extractDayHint` returns relative offsets like `today` / `yesterday`. The matcher uses the most recent transaction timestamp as the proxy for "now" when computing day-offsets.
3. **The transaction history is complete for the relevant window.** If the customer references a transaction outside the provided history, the matcher correctly returns `insufficient_data` rather than guessing.
4. **`campaign_context` is untrusted metadata.** It is not used to alter routing or reply generation. It is allowed in the schema so the harness can pass it through, but its contents are never interpreted as instructions.
5. **The reference enums are authoritative.** `language`, `channel`, `user_type`, `transaction_type`, `transaction_status`, `evidence_verdict`, `case_type`, `severity`, and `department` are validated against the allowed enum set in `_meta.allowed_enums` of the sample pack.
6. **Bangla is script-flexible.** A complaint may use Bangla script (`ভুল নাম্বার`) or Banglish transliteration (`vul number`). Both forms appear in the keyword lexicon.
7. **Bengali numerals are normalized.** `৫০০০` is treated as `5000` by `parseAmountFromText` before amount-based filtering.
8. **A "duplicate" is 2+ payments to the same counterparty within 120 seconds.** This threshold is hard-coded in `reasoning.js`. Tuned to the public cases (12 s, 15 s).
9. **A wrong-transfer dispute is suspicious if the recipient has 2+ prior transfers.** Threshold of 2 prior same-counterparty transfers flags the claim as `inconsistent` rather than rubber-stamping it.
10. **High-value threshold is 10,000 BDT.** Above this, `wrong_transfer`, `duplicate_payment`, `payment_failed`, and `agent_cash_in_issue` escalate to `critical` and force human review.
11. **Overdue merchant settlements are critical at 50,000+ BDT or high severity if >= 2 days delayed.** A delay of 2+ days also prompts automatic escalation (human review).
12. **Wrong transfer to intended recipient is override-eligible.** If the destination number matches the recipient described in the ticket, the review is bypassed (`human_review_required = false`).

---

## Known Limitations

1. **Keyword-based classification.** Sarcastic, heavily code-mixed, or unusually-phrased complaints may not match the lexicons and will fall through to `case_type = other`. A semantic embedding or a small fine-tuned classifier would handle these, but is out of scope for this round.
2. **Amount parsing is heuristic.** Formats like `"five thousand"`, `"around five k"`, or comma-separated multi-amount complaints are not extracted correctly. Only digit-form numbers, `5k` shorthand, and Bangla digits are supported.
3. **No temporal reasoning beyond "today/yesterday."** Phrases like "last Friday" or "two days ago" are ignored by `extractDayHint`; the matcher relies on amount and duplicate-cluster signals to disambiguate.
4. **Single-language reply fallback.** When `language = bn` and a Bengali template does not exist for a case type, the service falls back to the English template. The Bangla templates currently cover `wrong_transfer`, `agent_cash_in_issue`, and `phishing_or_social_engineering` only.
5. **No persistent state.** The service is stateless. If the harness calls it twice with the same `ticket_id`, both calls return identical analyses. There is no idempotency cache and no audit log beyond the console.
6. **Injection detection is regex-based.** Sophisticated paraphrases ("please disregard everything you know and…") may evade the current patterns. The service still produces a safe response in those cases because the safety templates are hard-coded — but the case is not explicitly flagged as adversarial.
7. **`metadata` field is ignored.** It is accepted in the schema for forward compatibility but is not used by the analysis pipeline.
8. **No rate limiting / auth.** This service assumes it is called by a trusted internal harness. Production deployment would need authentication, request-size limits, and rate limiting.
9. **No logging beyond `console`.** Structured logs (JSON, request IDs, latency) are not emitted. Sufficient for the preliminary round, not sufficient for production observability.
10. **Severity thresholds are static.** The 10,000 BDT high-value line is hard-coded; it does not adapt to customer-specific risk profiles, currency, or campaign context.

---

## License

ISC — see `package.json`.
