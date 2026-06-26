import { readFileSync } from "fs";

const data = JSON.parse(readFileSync(new URL("../test.json", import.meta.url)));

async function run() {
    let passed = 0;
    let failed = 0;
    for (const c of data.cases) {
        try {
            const res = await fetch("http://localhost:8000/analyze-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(c.input)
            });
            const out = await res.json();
            const exp = c.expected_output;
            
            // Check mismatch fields
            const mismatches = [];
            const fieldsToCheck = [
                "relevant_transaction_id",
                "evidence_verdict",
                "case_type",
                "department",
                "severity",
                "human_review_required"
            ];
            
            for (const f of fieldsToCheck) {
                if (out[f] !== exp[f]) {
                    mismatches.push(`${f}: got '${out[f]}', expected '${exp[f]}'`);
                }
            }
            
            if (mismatches.length === 0) {
                console.log(`${c.id} (${c.label}): PASS`);
                passed++;
            } else {
                console.log(`${c.id} (${c.label}): FAIL`);
                console.log(`  Mismatches:\n    - ${mismatches.join("\n    - ")}`);
                // console.log(`  Full got:`, JSON.stringify(out));
                failed++;
            }
        } catch (e) {
            console.log(`${c.id} (${c.label}): ERROR - ${e.message}`);
            failed++;
        }
    }
    console.log(`\nSummary: Passed ${passed}/${data.cases.length}, Failed ${failed}`);
}

run();
