import { parseAmountFromText, extractDayHint, daysBetween } from "./utils.js";

export function matchTransaction(complaint, history, caseType) {
    if (!history || history.length === 0) {
        return { match: null, candidates: [], verdict: "insufficient_data", ambiguous: false };
    }

    const amount = parseAmountFromText(complaint);
    const dayHint = extractDayHint(complaint);

    let candidates = history;


    if (caseType === "wrong_transfer") {
        candidates = candidates.filter(t => t.type === "transfer");
    } else if (caseType === "agent_cash_in_issue") {
        candidates = candidates.filter(t => t.type === "cash_in");
    }


    if (caseType === "merchant_settlement_delay" && amount != null) {
        const pendingSettlements = history.filter(t => t.type === "settlement" && t.status === "pending");
        const sumPending = pendingSettlements.reduce((acc, t) => acc + t.amount, 0);
        if (Math.abs(sumPending - amount) < 1) {
            candidates = pendingSettlements;
        } else {
            const exactMatches = pendingSettlements.filter(t => Math.abs(t.amount - amount) < 1);
            if (exactMatches.length > 0) {
                candidates = exactMatches;
            }
        }
    }

    if (amount != null && caseType !== "merchant_settlement_delay") {
        candidates = candidates.filter(t => Math.abs(t.amount - amount) < 1);
    }

    if (dayHint != null && ["wrong_transfer", "payment_failed"].includes(caseType)) {
        candidates = candidates.filter(t => {
            const diff = daysBetween("2026-04-14T23:59:59Z", t.timestamp);
            return diff === Math.abs(dayHint);
        });
    }

    if (candidates.length === 0) {
        return { match: null, candidates: [], verdict: "insufficient_data", ambiguous: false };
    }

    if (amount === null) {
        // Smart matching when amount is null
        if (caseType === "phishing_or_social_engineering") {
            const completed = candidates.filter(t => t.status === "completed");
            if (completed.length > 0) {
                return { match: completed[0], candidates, verdict: "consistent", ambiguous: false };
            }
        }
        if (caseType === "refund_request") {
            const refunds = candidates.filter(t => t.type === "refund");
            if (refunds.length > 0) {
                return { match: refunds[0], candidates, verdict: "consistent", ambiguous: false };
            }
        }
        if (caseType === "merchant_settlement_delay") {
            const pendingSettlements = candidates.filter(t => t.type === "settlement" && t.status === "pending");
            if (pendingSettlements.length > 0) {
                const sorted = [...pendingSettlements].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return { match: sorted[0], candidates, verdict: "consistent", ambiguous: false };
            }
        }

        const failedTxns = candidates.filter(t => t.status === "failed");
        if (failedTxns.length === 1) {
            return { match: failedTxns[0], candidates, verdict: "consistent", ambiguous: false };
        }

        if (candidates.length === 1) {
            return { match: candidates[0], candidates, verdict: "consistent", ambiguous: false };
        }
        return { match: null, candidates, verdict: "insufficient_data", ambiguous: false };
    }

    if (caseType === "merchant_settlement_delay" && candidates.length > 0) {
        const sorted = [...candidates].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return { match: sorted[0], candidates, verdict: "consistent", ambiguous: false };
    }

    if (candidates.length === 1) {
        return { match: candidates[0], candidates, verdict: "consistent", ambiguous: false };
    }


    if (caseType === "payment_failed") {
        const failedTxns = candidates.filter(t => t.status === "failed");
        if (failedTxns.length > 0) {
            return { match: failedTxns[0], candidates, verdict: "consistent", ambiguous: false };
        }
    }

    if (caseType === "duplicate_payment" || caseType === "payment_failed") {
        const allFailed = candidates.every(t => t.status === "failed");
        const sorted = [...candidates].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (allFailed) {
            return { match: sorted[0], candidates, verdict: "consistent", ambiguous: false };
        } else {
            const completed = sorted.filter(t => t.status === "completed");
            if (completed.length > 1) {
                return { match: completed[1], candidates, verdict: "consistent", ambiguous: false, duplicateSuspected: true };
            }
            return { match: sorted[0], candidates, verdict: "consistent", ambiguous: false };
        }
    }

    return { match: null, candidates, verdict: "insufficient_data", ambiguous: true };
}

export function checkInconsistency(caseType, match, history, complaint, userType) {
    if (!match) return "insufficient_data";

    if (caseType === "other") {
        if (match.amount === 0) return "inconsistent";
        const text = complaint ? complaint.toLowerCase() : "";
        const isUnsolicitedReceipt = text.includes("received") || text.includes("receive") ||
            text.includes("unsolicited") || text.includes("sent me") ||
            text.includes("credited");
        if (isUnsolicitedReceipt) {
            return "consistent";
        }
        return "insufficient_data";
    }


    if (new Date(match.timestamp) > new Date()) {
        return "insufficient_data";
    }

    if (match.amount === 0) {
        return "inconsistent";
    }

    if (caseType === "wrong_transfer") {
        if (match.status === "reversed" || match.status === "failed") {
            return "inconsistent";
        }
        if (match.counterparty === null) {
            return "insufficient_data";
        }
        const priorSame = history.filter(
            t => t.counterparty === match.counterparty && t.transaction_id !== match.transaction_id
        );
        if (priorSame.length >= 2) {
            return "inconsistent";
        }

        if (match.counterparty && complaint) {
            const hasIntendedRelation = /(?:mother|father|brother|sister|friend|parent|intended|correct|intended recipient)/i.test(complaint);
            if (hasIntendedRelation) {
                const matchDigits = match.counterparty.replace(/\D/g, "");
                if (matchDigits.length >= 10) {
                    const suffix = matchDigits.slice(-10);
                    const complaintDigits = complaint.replace(/\D/g, "");
                    if (complaintDigits.includes(suffix)) {
                        return "inconsistent";
                    }
                }
            }
        }
    }

    if (caseType === "payment_failed") {
        if (match.status === "completed") return "inconsistent";
        if (match.status === "pending") return "inconsistent";
    }

    if (caseType === "refund_request") {

        if (match.status === "reversed" && userType !== "merchant") {
            return "inconsistent";
        }
    }

    if (caseType === "duplicate_payment") {
        const samePayments = history.filter(
            t => t.counterparty === match.counterparty &&
                Math.abs(t.amount - match.amount) < 1
        );
        if (samePayments.length < 2) return "inconsistent";
    }

    if (caseType === "merchant_settlement_delay") {
        if (match.type !== "settlement") return "insufficient_data";
    }

    return "consistent";
}