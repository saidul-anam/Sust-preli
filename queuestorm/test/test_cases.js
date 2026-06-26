import { readFileSync } from "fs";

const data = JSON.parse(readFileSync(new URL("../QueueStorm_Preli_Sample_Cases.json", import.meta.url)));

async function run() {
    for (const c of data.cases) {
        const res = await fetch("http://localhost:8000/analyze-ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c.input)
        });
        const out = await res.json();
        const exp = c.expected_output;
        const ok =
            out.relevant_transaction_id === exp.relevant_transaction_id &&
            out.evidence_verdict === exp.evidence_verdict &&
            out.case_type === exp.case_type &&
            out.department === exp.department &&
            out.severity === exp.severity &&
            out.human_review_required === exp.human_review_required;
        console.log(c.id, ok ? "PASS" : "FAIL");
        if (!ok) console.log("  got:", JSON.stringify(out));
    }
}

run();