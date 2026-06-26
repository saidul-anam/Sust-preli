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
    if (typeof req.body?.complaint === "string" && req.body.complaint.trim() === "") {
        return res.status(422).json({ error: "complaint cannot be empty" });
    }
    let parsed;
    try {
        parsed = TicketRequestSchema.parse(req.body);
    } catch (e) {
        return res.status(400).json({ error: "invalid request schema" });
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
    const { ticket_id, complaint, language, user_type, transaction_history, campaign_context, metadata } = input;

    const INJECTION_PATTERNS = [
        /\bignore\s+(?:all\s+)?previous\b/i,
        /\bsystem\s+prompt\b/i,
        /\byou\s+are\s+now\b/i,
        /\bdisregard\b/i,
        /\bforget\s+instructions\b/i,
        /\bact\s+as\b/i,
        /\bbypass\b/i,
        /\bsystem\s+override\b/i,
        /\boverride\b/i
    ];
    const isStringInjection = (str) => typeof str === "string" && INJECTION_PATTERNS.some(p => p.test(str));

    const isComplaintInjection = isStringInjection(complaint);
    let isContextInjection = isStringInjection(campaign_context);
    if (metadata) {
        for (const key of Object.keys(metadata)) {
            if (isStringInjection(metadata[key]) || isStringInjection(key)) {
                isContextInjection = true;
            }
        }
    }

    if (isComplaintInjection || isContextInjection) {
        console.warn("possible injection detected in ticket:", ticket_id);
    }

    const caseType = isComplaintInjection ? "other" : classifyCaseType(complaint);
    const { match, verdict: rawVerdict, ambiguous } = matchTransaction(complaint, transaction_history, caseType);
    const verdict = match ? checkInconsistency(caseType, match, transaction_history, complaint, user_type) : rawVerdict;

    const amount = match ? match.amount : parseAmountFromText(complaint);
    const severity = getSeverity(caseType, verdict, amount, match, { isComplaintInjection, isContextInjection, campaign_context, complaint, user_type, history: transaction_history });
    const department = isComplaintInjection ? "fraud_risk" : getDepartment(caseType, user_type, match, complaint, verdict);
    const humanReview = (isComplaintInjection || isContextInjection) ? true : needsHumanReview(caseType, verdict, severity, match, complaint, user_type, transaction_history);
    const txnId = match ? match.transaction_id : null;


    let detectedLang = language;
    if (complaint) {
        const hasBangla = /[\u0980-\u09FF]/.test(complaint);
        if (hasBangla) {
            detectedLang = "bn";
        } else if (language === "bn") {

            detectedLang = "en";
        }
    }

    return {
        ticket_id,
        relevant_transaction_id: txnId,
        evidence_verdict: verdict,
        case_type: caseType,
        severity,
        department,
        agent_summary: buildAgentSummary(caseType, txnId, complaint, ambiguous),
        recommended_next_action: buildNextAction(caseType, txnId, verdict),
        customer_reply: generateCustomerReply(caseType, txnId, detectedLang),
        human_review_required: humanReview,
        confidence: match ? 0.9 : (ambiguous ? 0.6 : 0.5),
        reason_codes: [caseType, match ? "transaction_match" : "no_match"]
    };
}

export default app;