import express from "express";
import { TicketRequestSchema } from "./schemas.js";
import { matchTransaction, checkInconsistency } from "./reasoning.js";
import { classifyCaseType, getDepartment, getSeverity, needsHumanReview } from "./classifier.js";
import { generateCustomerReply } from "./safety.js";
import { buildAgentSummary, buildNextAction } from "./summaries.js";
import { parseAmountFromText } from "./utils.js";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.post("/analyze-ticket", (req, res) => {
    let parsed;
    try {
        parsed = TicketRequestSchema.parse(req.body);
    } catch (e) {
        // Zod rejects missing/wrong-type fields → 400
        // Empty-string complaint also rejected by min(1) → treat as 422 here
        if (typeof req.body?.complaint === "string" && req.body.complaint.trim() === "") {
            return res.status(422).json({ error: "complaint cannot be empty" });
        }
        return res.status(400).json({ error: "invalid request schema" });
    }

    // Whitespace-only complaint passes Zod min(1) but is semantically invalid → 422
    if (parsed.complaint.trim() === "") {
        return res.status(422).json({ error: "complaint cannot be empty" });
    }

    try {
        const result = analyzeTicket(parsed);
        return res.status(200).json(result);
    } catch (e) {
        console.error("internal error:", e.message);
        return res.status(500).json({ error: "internal processing error" });
    }
});


app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
        return res.status(400).json({ error: "malformed JSON body" });
    }
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
});

function analyzeTicket(input) {
    const { ticket_id, complaint, language, user_type, transaction_history } = input;

    const INJECTION_PATTERNS = [
        /ignore previous/i, /system prompt/i, /you are now/i,
        /disregard/i, /forget instructions/i, /act as/i
    ];
    const isInjection = INJECTION_PATTERNS.some(p => p.test(complaint));
    if (isInjection) {
        console.warn("possible prompt injection detected in ticket:", ticket_id);
    }

    const caseType = isInjection ? "other" : classifyCaseType(complaint);
    const { match, verdict: rawVerdict, ambiguous } = matchTransaction(complaint, transaction_history);
    const verdict = match ? checkInconsistency(caseType, match, transaction_history) : rawVerdict;

    const amount = match ? match.amount : parseAmountFromText(complaint);
    const severity = getSeverity(caseType, verdict, amount);
    const department = isInjection ? "customer_support" : getDepartment(caseType, user_type);
    const humanReview = isInjection ? true : needsHumanReview(caseType, verdict, severity);
    const txnId = match ? match.transaction_id : null;

    return {
        ticket_id,
        relevant_transaction_id: txnId,
        evidence_verdict: verdict,
        case_type: caseType,
        severity,
        department,
        agent_summary: buildAgentSummary(caseType, txnId, complaint, ambiguous),
        recommended_next_action: buildNextAction(caseType, txnId, verdict),
        customer_reply: generateCustomerReply(caseType, txnId, language),
        human_review_required: humanReview,
        confidence: match ? 0.9 : (ambiguous ? 0.6 : 0.5),
        reason_codes: [caseType, match ? "transaction_match" : "no_match"]
    };
}

export default app;