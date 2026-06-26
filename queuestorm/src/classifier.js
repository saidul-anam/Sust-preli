import { CASE_TYPE_KEYWORDS, CASE_TYPE_PRIORITY } from "./keywords.js";

export function classifyCaseType(complaint) {
    const text = complaint.toLowerCase();
    for (const type of CASE_TYPE_PRIORITY) {
        const words = CASE_TYPE_KEYWORDS[type];
        if (words.some(w => text.includes(w.toLowerCase()))) return type;
    }
    return "other";
}

const DEPARTMENT_MAP = {
    wrong_transfer: "dispute_resolution",
    payment_failed: "payments_ops",
    refund_request: "customer_support",
    duplicate_payment: "payments_ops",
    merchant_settlement_delay: "merchant_operations",
    agent_cash_in_issue: "agent_operations",
    phishing_or_social_engineering: "fraud_risk",
    other: "customer_support"
};

export function getDepartment(caseType, userType) {
    if (userType === "merchant" && caseType === "other") return "merchant_operations";
    return DEPARTMENT_MAP[caseType] || "customer_support";
}

export function getSeverity(caseType, evidenceVerdict, amount) {
    if (caseType === "phishing_or_social_engineering") return "critical";
    if (evidenceVerdict === "insufficient_data") return "medium"; // ambiguous is still risky
    if (["wrong_transfer", "duplicate_payment", "payment_failed", "agent_cash_in_issue"].includes(caseType)) {
        if (amount && amount >= 10000) return "critical";
        return evidenceVerdict === "inconsistent" ? "medium" : "high";
    }
    if (caseType === "merchant_settlement_delay") return "medium";
    return "low"; // refund_request, other
}

export function needsHumanReview(caseType, evidenceVerdict, severity) {
    if (evidenceVerdict === "insufficient_data") return true; // can't automate without evidence
    if (caseType === "phishing_or_social_engineering") return true;
    if (caseType === "payment_failed" && evidenceVerdict === "consistent") return false; // automated flow exists
    if (caseType === "merchant_settlement_delay") return false; // informational, ops handles without escalation
    if (severity === "critical" || severity === "high") return true;
    if (evidenceVerdict === "inconsistent") return true;
    return false;
}