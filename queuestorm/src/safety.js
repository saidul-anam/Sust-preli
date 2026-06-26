const SAFETY_LINE = {
    en: "Please do not share your PIN or OTP with anyone.",
    bn: "অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।"
};

const TEMPLATES = {
    wrong_transfer: {
        en: (txn) => `We have noted your concern about transaction ${txn}. Our dispute team will review the case and contact you through official support channels. ${SAFETY_LINE.en}`,
        bn: (txn) => `আপনার লেনদেন ${txn} এর বিষয়ে আমরা অবগত হয়েছি। আমাদের দল এটি যাচাই করে অফিসিয়াল চ্যানেলে যোগাযোগ করবে। ${SAFETY_LINE.bn}`
    },
    payment_failed: {
        en: (txn) => `We have noted that transaction ${txn} may have caused an unexpected balance deduction. Our payments team will review the case and any eligible amount will be returned through official channels. ${SAFETY_LINE.en}`
    },
    refund_request: {
        en: (txn) => `Thank you for reaching out. Refunds depend on the applicable policy for transaction ${txn}. We recommend contacting the merchant directly, or reply here and we will guide you. ${SAFETY_LINE.en}`
    },
    duplicate_payment: {
        en: (txn) => `We have noted the possible duplicate payment for transaction ${txn}. Our payments team will verify and any eligible amount will be returned through official channels. ${SAFETY_LINE.en}`
    },
    merchant_settlement_delay: {
        en: (txn) => `We have noted your concern about settlement ${txn}. Our merchant operations team will check the batch status and update you on the expected settlement time through official channels.`
    },
    agent_cash_in_issue: {
        en: (txn) => `We have noted your concern about transaction ${txn}. Our agent operations team will verify the status and update you through official channels. ${SAFETY_LINE.en}`,
        bn: (txn) => `আপনার লেনদেন ${txn} এর বিষয়ে আমরা অবগত হয়েছি। আমাদের এজেন্ট অপারেশন্স দল এটি যাচাই করবে এবং অফিসিয়াল চ্যানেলে জানাবে। ${SAFETY_LINE.bn}`
    },
    phishing_or_social_engineering: {
        en: () => `Thank you for reaching out before sharing any information. We never ask for your PIN, OTP, or password under any circumstances. Please do not share these with anyone, even if they claim to be from us. Our fraud team has been notified of this incident.`
    },
    other: {
        en: (txn) => `Thank you for reaching out. To help you faster, please share the transaction ID, amount, and a short description of what went wrong. ${SAFETY_LINE.en}`
    }
};

export function generateCustomerReply(caseType, txnId, language = "en") {
    const lang = language === "bn" ? "bn" : "en";
    const group = TEMPLATES[caseType] || TEMPLATES.other;
    const template = group[lang] || group.en;
    return template(txnId ?? "N/A");
}