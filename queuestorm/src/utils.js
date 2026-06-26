
export function parseAmountFromText(text) {
    if (!text) return null;


    const banglaDigits = "০১২৩৪৫৬৭৮৯";
    let normalized = text.replace(/[০-৯]/g, (d) => banglaDigits.indexOf(d));

    normalized = normalized.replace(/(\d),(\d{3})/g, "$1$2");


    const kMatch = normalized.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) return parseFloat(kMatch[1]) * 1000;


    const currencyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(taka|tk|bdt|টাকা)/i);
    if (currencyMatch) return parseFloat(currencyMatch[1]);

    const numMatch = normalized.match(/\b(\d{2,7})\b/);
    if (numMatch) return parseFloat(numMatch[1]);

    return null;
}


export function extractDayHint(text) {
    const t = text.toLowerCase();
    if (t.includes("yesterday") || t.includes("গতকাল")) return -1;
    if (t.includes("today") || t.includes("আজ") || t.includes("this morning") || t.includes("সকালে")) return 0;
    return null;
}

export function daysBetween(tsA, tsB) {
    const a = new Date(tsA);
    const b = new Date(tsB);
    const dateA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const dateB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((dateA - dateB) / (1000 * 60 * 60 * 24));
}
