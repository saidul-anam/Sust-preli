export const CASE_TYPE_KEYWORDS = {
    phishing_or_social_engineering: [
        "otp", "pin", "password", "full card number", "card number", "cvv", "credentials",
        "called me", "account will be blocked", "scam", "fraud", "suspicious call", "fake call",
        "claiming to be", "verify your account", "share your", "give me your",
        "ওটিপি", "পিন", "পাসওয়ার্ড", "কল করে", "স্কাম", "জাল কল", "প্রতারণা", "ব্লক করবে",
        "otp dite boleche", "pin nite cheyeche", "block korbe boleche", "pass change", "acc block"
    ],
    duplicate_payment: [
        "twice", "duplicate", "charged twice", "double charge", "deducted twice", "paid only once",
        "2 times", "two times", "repeated charge", "same amount again",
        "দুইবার", "ডুপ্লিকেট", "ডাবল", "২ বার", "দুই বার",
        "duibar keteche", "twice deduct", "double cut", "2 bar keteche", "double keteche", "same tk 2 bar"
    ],
    agent_cash_in_issue: [
        "cash in", "cash-in", "agent", "balance has not come", "balance hasn't come", "agent says",
        "agent point", "deposited money", "money to agent",
        "ক্যাশ ইন", "এজেন্ট", "দোকানদার", "এজেন্ট পয়েন্ট",
        "cash in hoyni", "balance aseni", "agent e diyechi", "dokan theke", "agent tk", "agent ashini"
    ],
    merchant_settlement_delay: [
        "settlement", "settle", "not settled", "sales", "merchant wallet", "biller payment delay", "biller node",
        "সেটেলমেন্ট", "বিক্রি", "মার্চেন্ট", "সেটেল"
    ],

    payment_failed: [
        "failed", "balance deducted", "balance was deducted", "showed failed", "transaction failed",
        "money deducted", "tk kete nise", "money cut", "fail dekhay", "unsuccessful", "pending long time",
        "ব্যর্থ", "কাটা হয়েছে", "ফেইল", "ব্যর্থ লেনদেন", "টাকা কেটেছে",
        "fail hoyeche", "deduct hoyeche", "kete gese", "balance kete", "show korche failed", "tk kete", "failed payment"
    ],
    wrong_transfer: [
        "wrong number", "wrong person", "sent to wrong", "typed it wrong", "mistake", "wrong recipient",
        "accidental transfer", "sent mistakenly", "bhul number",
        "didn't get it", "he didn't receive", "not received", "hasn't received", "did not get",
        "ভুল নাম্বার", "ভুল মানুষ", "ভুলে", "ভুল নাম্বারে", "ভুল একাউন্ট",
        "vul number", "vul transfer", "wrong e pathiye", "ভুল e", "wrong number e", "pathayfelse", "pathaisi", "niye gese"
    ],
    refund_request: [
        "refund", "money back", "return my money", "changed my mind", "don't want it anymore", "cancel order",
        "রিফান্ড", "টাকা ফেরত", "ফেরত দিন", "টাকা ব্যাক",
        "ferat chai", "takar ferat", "ফেরত চাই", "money ferat", "tk ferot", "refund lagbe"
    ]
};

export const CASE_TYPE_PRIORITY = [
    "phishing_or_social_engineering",
    "duplicate_payment",
    "agent_cash_in_issue",
    "merchant_settlement_delay",
    "wrong_transfer",
    "payment_failed",
    "refund_request"
];