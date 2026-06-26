export const CASE_TYPE_KEYWORDS = {
    phishing_or_social_engineering: [
        "otp", "pin", "password", "full card number", "card number",
        "called me", "they said my account will be blocked", "scam", "fraud", "suspicious call",
        "claiming to be from", "verify your account",
        "ওটিপি", "পিন", "পাসওয়ার্ড", "কল করে", "স্কাম", "জাল কল"
    ],
    duplicate_payment: [
        "twice", "duplicate", "charged twice", "double charge", "deducted twice", "paid only once",
        "দুইবার", "ডুপ্লিকেট"
    ],
    agent_cash_in_issue: [
        "cash in", "cash-in", "agent", "balance has not come", "balance hasn't come", "agent says",
        "ক্যাশ ইন", "এজেন্ট"
    ],
    merchant_settlement_delay: [
        "settlement", "settle", "not settled", "sales",
        "সেটেলমেন্ট", "বিক্রি"
    ],
    payment_failed: [
        "failed", "balance deducted", "balance was deducted", "showed failed", "transaction failed",
        "ব্যর্থ", "কাটা হয়েছে", "ফেইল"
    ],
    wrong_transfer: [
        "wrong number", "wrong person", "sent to wrong", "typed it wrong", "mistake",
        "didn't get it", "he didn't receive", "not received", "hasn't received", "did not get",
        "ভুল নাম্বার", "ভুল মানুষ", "ভুলে"
    ],
    refund_request: [
        "refund", "money back", "return my money", "changed my mind", "don't want it anymore",
        "রিফান্ড", "টাকা ফেরত"
    ]
};

// Priority order matters: check phishing first (highest severity signal), then specific cases, "refund_request" and "other" last.
export const CASE_TYPE_PRIORITY = [
    "phishing_or_social_engineering",
    "duplicate_payment",
    "agent_cash_in_issue",
    "merchant_settlement_delay",
    "wrong_transfer",
    "payment_failed",
    "refund_request"
];