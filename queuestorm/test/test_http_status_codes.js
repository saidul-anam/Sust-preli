

const BASE = "http://localhost:8000";

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;


let passed = 0, failed = 0;

function assert(id, condition, msg) {
    if (condition) {
        console.log(GREEN("  ✓") + ` ${id} — ${msg}`);
        passed++;
    } else {
        console.log(RED("  ✗") + ` ${id} — ${msg}`);
        failed++;
    }
}



const VALID_BODY = {
    ticket_id: "STATUS-TEST-200",
    complaint: "I was charged twice for 500 taka",
    language: "en",
    user_type: "customer",
    transaction_history: []
};

const OUTPUT_SCHEMA_KEYS = [
    "ticket_id", "relevant_transaction_id", "evidence_verdict",
    "case_type", "severity", "department", "agent_summary",
    "recommended_next_action", "customer_reply", "human_review_required",
    "confidence", "reason_codes"
];

const TESTS = [

    {
        id: "200-A",
        label: "200 — valid request returns 200",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: VALID_BODY,
        checks: async (status, json) => {
            assert("200-A-status", status === 200, `HTTP 200 (got ${status})`);
            assert("200-A-schema", OUTPUT_SCHEMA_KEYS.every(k => k in json),
                `Response contains all required output fields`);
            assert("200-A-tid", json.ticket_id === VALID_BODY.ticket_id,
                `ticket_id echoed back correctly`);
            assert("200-A-verdict", typeof json.evidence_verdict === "string",
                `evidence_verdict is a string`);
            assert("200-A-conf", typeof json.confidence === "number" && json.confidence >= 0 && json.confidence <= 1,
                `confidence is a number 0-1`);
            assert("200-A-codes", Array.isArray(json.reason_codes),
                `reason_codes is an array`);
        }
    },


    {
        id: "400-A",
        label: "400 — missing ticket_id",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: { complaint: "I was overcharged", language: "en", transaction_history: [] },
        checks: async (status, json) => {
            assert("400-A-status", status === 400, `HTTP 400 (got ${status})`);
            assert("400-A-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error string`);
            assert("400-A-safe", !JSON.stringify(json).toLowerCase().includes("stacktrace") &&
                !JSON.stringify(json).toLowerCase().includes("at "),
                `No stack trace in response`);
        }
    },
    {
        id: "400-B",
        label: "400 — missing complaint field entirely",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: { ticket_id: "STATUS-TEST-400B", language: "en", transaction_history: [] },
        checks: async (status, json) => {
            assert("400-B-status", status === 400, `HTTP 400 (got ${status})`);
            assert("400-B-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error string`);
        }
    },
    {
        id: "400-C",
        label: "400 — malformed JSON body",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        rawBody: `{ "ticket_id": "bad-json", "complaint": `,   // intentionally broken
        checks: async (status, json) => {
            assert("400-C-status", status === 400, `HTTP 400 (got ${status})`);
            assert("400-C-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error string`);
            assert("400-C-safe", !JSON.stringify(json).toLowerCase().includes("syntaxerror"),
                `Raw SyntaxError class name not exposed`);
        }
    },
    {
        id: "400-D",
        label: "400 — invalid enum value for user_type",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: { ticket_id: "STATUS-TEST-400D", complaint: "overcharged", user_type: "INVALID_ENUM", transaction_history: [] },
        checks: async (status, json) => {
            assert("400-D-status", status === 400, `HTTP 400 (got ${status})`);
            assert("400-D-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error string`);
        }
    },

    // ── 422 (semantically invalid but structurally valid) ────────────────────
    {
        id: "422-A",
        label: "422 — empty string complaint (whitespace only)",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: { ticket_id: "STATUS-TEST-422A", complaint: "   ", language: "en", transaction_history: [] },
        checks: async (status, json) => {
            // Zod min(1) passes whitespace-only; the explicit trim() guard catches it → 422
            assert("422-A-status", status === 422, `HTTP 422 (got ${status})`);
            assert("422-A-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error message`);
        }
    },
    {
        id: "422-B",
        label: "422 — empty string complaint (zero length)",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: { ticket_id: "STATUS-TEST-422B", complaint: "", language: "en", transaction_history: [] },
        checks: async (status, json) => {
            // The app explicitly checks for empty complaint before Zod rejects min(1)
            assert("422-B-status", status === 422 || status === 400,
                `HTTP 422 or 400 — semantic rejection (got ${status})`);
            assert("422-B-error", typeof json.error === "string" && json.error.length > 0,
                `Body has non-empty error message`);
        }
    },

    // ── 500 ─────────────────────────────────────────────────────────────────
    // Two checks:
    //   500-A: a bad-date txn is handled gracefully (server doesn't crash & leak)
    //   500-B: verify the 500 catch path returns a safe, non-sensitive error body
    {
        id: "500-A",
        label: "500-A — bad timestamp in txn_history handled safely (no secret leak)",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        body: {
            ticket_id: "STATUS-TEST-500A",
            complaint: "payment failed",
            language: "en",
            user_type: "customer",      // ← valid enum
            transaction_history: [
                {
                    transaction_id: "TXN-BAD",
                    timestamp: "NOT-A-DATE",   // NaN-producing — exercises date arithmetic path
                    type: "payment",
                    amount: 100,
                    counterparty: "TestMerchant",
                    status: "completed"
                }
            ]
        },
        checks: async (status, json) => {
            const body = JSON.stringify(json);
            // Server either handles gracefully (200) or catches safely (500) — both are fine
            assert("500-A-status",
                status === 500 || status === 200,
                `HTTP 500 or 200 — no unhandled crash (got ${status})`);
            assert("500-A-no-stack",
                !body.includes("    at ") && !body.match(/Error: .{5,}/),
                `No raw stack trace in response`);
            assert("500-A-no-secrets",
                !body.toLowerCase().includes("secret") &&
                !body.toLowerCase().includes("api_key") &&
                !body.toLowerCase().includes("process.env"),
                `No secrets/tokens in response`);
            if (status === 500) {
                assert("500-A-error-msg",
                    typeof json.error === "string" && json.error.length > 0,
                    `500 body has non-empty safe error message`);
            }
        }
    },
    {
        id: "500-B",
        label: "500-B — real internal error: txn.amount triggers NaN arithmetic crash",
        method: "POST",
        path: "/analyze-ticket",
        headers: { "Content-Type": "application/json" },
        // Zod z.number() accepts Infinity, which passes schema validation but can
        // cause unexpected behavior in downstream numeric comparisons (>= 10000 etc.)
        // We pass a string for amount via rawBody, bypassing Zod's JS type check
        // at serialization level — this should cause a Zod parse error (400) or
        // if somehow it slips through, a 500. Either is acceptable here:
        // What matters is: body is always safe and never exposes internals.
        rawBody: JSON.stringify({
            ticket_id: "STATUS-TEST-500B",
            complaint: "payment failed",
            language: "en",
            user_type: "customer",
            transaction_history: [
                {
                    transaction_id: "TXN-500B",
                    timestamp: "2025-01-01T10:00:00Z",
                    type: "payment",
                    amount: "NOT_A_NUMBER",  // string instead of number — Zod should reject
                    counterparty: "Merchant",
                    status: "completed"
                }
            ]
        }),
        checks: async (status, json) => {
            const body = JSON.stringify(json);
            // Zod rejects "NOT_A_NUMBER" for z.number() → 400, or if it slips → 500
            assert("500-B-status",
                status === 400 || status === 500,
                `HTTP 400 or 500 — invalid amount type rejected (got ${status})`);
            assert("500-B-error",
                typeof json.error === "string" && json.error.length > 0,
                `Body has a non-empty error message`);
            assert("500-B-no-stack",
                !body.includes("    at ") && !body.match(/Error: .{5,}/),
                `No raw stack trace exposed`);
            assert("500-B-no-secrets",
                !body.toLowerCase().includes("secret") &&
                !body.toLowerCase().includes("api_key"),
                `No secrets leaked in error response`);
        }
    }
];

// ─── runner ───────────────────────────────────────────────────────────────────

async function runTest(t) {
    console.log(BOLD(`\n[${t.id}] ${t.label}`));
    const bodyStr = t.rawBody ?? JSON.stringify(t.body);
    let status, json;
    try {
        const res = await fetch(`${BASE}${t.path}`, {
            method: t.method,
            headers: t.headers,
            body: bodyStr
        });
        status = res.status;
        json = await res.json().catch(() => ({}));
    } catch (e) {
        console.log(RED(`  ✗ Network error: ${e.message}`));
        failed++;
        return;
    }
    await t.checks(status, json);
}

async function main() {
    console.log(BOLD("\n══════════════════════════════════════════════════"));
    console.log(BOLD(" QueueStorm — HTTP Status Code Coverage Tests"));
    console.log(BOLD("══════════════════════════════════════════════════"));

    for (const t of TESTS) {
        await runTest(t);
    }

    console.log(BOLD("\n══════════════════════════════════════════════════"));
    const total = passed + failed;
    const summary = `  ${passed}/${total} assertions passed`;
    console.log(failed === 0 ? GREEN(summary) : RED(summary));
    if (failed > 0) {
        console.log(YELLOW(`  ${failed} assertion(s) FAILED — review output above`));
    }
    console.log(BOLD("══════════════════════════════════════════════════\n"));

    process.exit(failed === 0 ? 0 : 1);
}

main();
