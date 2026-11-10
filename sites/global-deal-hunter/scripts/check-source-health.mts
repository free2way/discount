import { readFile } from "node:fs/promises";

const inputUrl = new URL("../data/feed-scan.json", import.meta.url);
const snapshot = JSON.parse(await readFile(inputUrl, "utf8")) as {
  status: string;
  source_results: Array<{
    source_id: string;
    source_name: string;
    consecutive_failures?: number;
    error?: string | null;
  }>;
};

const unhealthy = snapshot.source_results.filter((source) => (source.consecutive_failures ?? 0) >= 3);
if (snapshot.status === "failed" || unhealthy.length) {
  console.error(JSON.stringify({ status: snapshot.status, unhealthy }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: snapshot.status, unhealthy: 0 }));
}
