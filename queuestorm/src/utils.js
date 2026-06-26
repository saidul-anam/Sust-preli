// Extract a numeric amount from complaint text (handles "5000", "5,000", "5k", with optional "taka"/"tk"/"৫০০০")
export function parseAmountFromText(text) {
  if (!text) return null;

  // Bangla digits -> English digits
  const banglaDigits = "০১২৩৪৫৬৭৮৯";
  let normalized = text.replace(/[০-৯]/g, (d) => banglaDigits.indexOf(d));

  // remove commas in numbers: "5,000" -> "5000"
  normalized = normalized.replace(/(\d),(\d{3})/g, "$1$2");

  // match "5k" / "5K" style
  const kMatch = normalized.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  // match plain numbers, prefer ones near currency words
  const currencyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(taka|tk|bdt|টাকা)/i);
  if (currencyMatch) return parseFloat(currencyMatch[1]);

  // fallback: first standalone number with 2+ digits (avoid matching "2pm" hour)
  const numMatch = normalized.match(/\b(\d{2,7})\b/);
  if (numMatch) return parseFloat(numMatch[1]);

  return null;
}

// Rough time-window extraction: returns { dayOffset } where 0 = today, -1 = yesterday, null = unknown
// Note: "today/yesterday" is relative to ticket arrival, which we approximate using transaction recency only.
// We don't have "now" from the request, so we use the most recent transaction timestamp as a proxy for "today".
export function extractDayHint(text) {
  const t = text.toLowerCase();
  if (t.includes("yesterday") || t.includes("গতকাল")) return -1;
  if (t.includes("today") || t.includes("আজ")) return 0;
  return null;
}

export function daysBetween(tsA, tsB) {
  const a = new Date(tsA);
  const b = new Date(tsB);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
