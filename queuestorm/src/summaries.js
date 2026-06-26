export function buildAgentSummary(caseType, txnId, complaint, ambiguous) {
    const truncated = complaint.length > 140 ? complaint.slice(0, 140) + "..." : complaint;
    if (ambiguous) {
        return `Customer complaint could not be matched to a single transaction. Multiple candidates exist in history. Complaint: "${truncated}"`;
    }
    if (!txnId) {
        return `Customer complaint lacks sufficient detail to identify a relevant transaction. Complaint: "${truncated}"`;
    }
    return `Customer reports a ${caseType.replace(/_/g, " ")} issue related to transaction ${txnId}. Complaint: "${truncated}"`;
}

export function buildNextAction(caseType, txnId, verdict) {
    if (!txnId) {
        return "Request additional details from the customer (transaction ID, amount, approximate time) to identify the relevant transaction.";
    }
    const base = {
        wrong_transfer: `Verify ${txnId} details with the customer and initiate the wrong-transfer dispute workflow per policy.`,
        payment_failed: `Investigate ${txnId} ledger status. If balance was deducted on a failed payment, initiate the automatic reversal flow within standard SLA.`,
        refund_request: `Inform the customer of refund policy applicable to ${txnId} and provide next steps.`,
        duplicate_payment: `Verify the duplicate with payments_ops for ${txnId}. If confirmed, initiate reversal of the duplicate charge.`,
        merchant_settlement_delay: `Route to merchant_operations to verify settlement batch status for ${txnId} and communicate a revised ETA.`,
        agent_cash_in_issue: `Investigate ${txnId} pending status with agent operations and resolve within standard cash-in SLA.`,
        phishing_or_social_engineering: `Escalate to fraud_risk team immediately and log reported details for fraud pattern analysis.`,
        other: `Review ${txnId} manually and respond with appropriate guidance.`
    };
    return base[caseType] || `Review ${txnId} manually.`;
}