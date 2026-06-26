import { parseAmountFromText, extractDayHint, daysBetween } from "./utils.js";

export function matchTransaction(complaint, history) {
    if (!history || history.length === 0) {
        return { match: null, candidates: [], verdict: "insufficient_data", ambiguous: false };
    }

    const amount = parseAmountFromText(complaint);
    const dayHint = extractDayHint(complaint);

    let candidates = history;

    if (amount != null) {
        candidates = candidates.filter(t => Math.abs(t.amount - amount) < 1);
    }

    if (dayHint != null && candidates.length > 1) {
        const mostRecent = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        candidates = candidates.filter(t => daysBetween(mostRecent.timestamp, t.timestamp) === Math.abs(dayHint));
    }

    if (candidates.length === 0) {
        return { match: null, candidates: [], verdict: "insufficient_data", ambiguous: false };
    }

    if (candidates.length === 1) {
        return { match: candidates[0], candidates, verdict: "consistent", ambiguous: false };
    }

    if (candidates.length > 1 && amount == null) {
        return { match: null, candidates: [], verdict: "insufficient_data", ambiguous: false };
    }

    const sorted = [...candidates].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 1; i < sorted.length; i++) {
        const dt = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / 1000;
        if (dt < 120 && sorted[i].counterparty === sorted[i - 1].counterparty) {
            return { match: sorted[i], candidates, verdict: "consistent", ambiguous: false, duplicateSuspected: true };
        }
    }

    return { match: null, candidates, verdict: "insufficient_data", ambiguous: true };
}


export function checkInconsistency(caseType, match, history) {
    if (caseType === "wrong_transfer" && match) {
        const priorSame = history.filter(
            t => t.counterparty === match.counterparty && t.transaction_id !== match.transaction_id
        );
        if (priorSame.length >= 2) return "inconsistent";
    }


    if (caseType === "payment_failed" && match) {
        if (match.status === "completed") return "inconsistent";
    }


    if (caseType === "refund_request" && match) {
        if (match.status === "reversed") return "inconsistent";
    }


    if (caseType === "duplicate_payment" && match) {
        const samePayments = history.filter(
            t => t.counterparty === match.counterparty &&
                Math.abs(t.amount - match.amount) < 1
        );
        if (samePayments.length < 2) return "inconsistent";
    }

    return "consistent";
}