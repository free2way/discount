import { appendFile, readFile } from "node:fs/promises";
import { evaluateScanFreshness } from "../lib/scan-freshness.mjs";

const snapshotUrl = new URL("../data/feed-scan.json", import.meta.url);
let generatedAt = null;

try {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
  generatedAt = snapshot.generated_at;
} catch (error) {
  console.warn(`Unable to read the current scan snapshot: ${error instanceof Error ? error.message : String(error)}`);
}

const result = evaluateScanFreshness({
  generatedAt,
  maxAgeMinutes: Number(process.env.MAX_SCAN_AGE_MINUTES ?? 105),
  staleAgeMinutes: Number(process.env.STALE_SCAN_AGE_MINUTES ?? 180),
  force: process.env.FORCE_SCAN === "true",
});

const outputs = {
  should_scan: String(result.shouldScan),
  stale: String(result.stale),
  age_minutes: result.ageMinutes === null ? "unknown" : String(result.ageMinutes),
  last_scan_at: result.lastScanAt ?? "unknown",
  reason: result.reason,
};

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const action = result.shouldScan ? "run scan" : "skip scan";
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `### Scan freshness\n\n- Decision: **${action}**\n- Last scan: ${outputs.last_scan_at}\n- Age: ${outputs.age_minutes} minutes\n- Reason: ${result.reason}\n`,
  );
}

console.log(JSON.stringify({ ...outputs, generated_at: generatedAt }, null, 2));
