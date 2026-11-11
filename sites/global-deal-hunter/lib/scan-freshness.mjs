const MINUTE_MS = 60_000;
const MAX_CLOCK_SKEW_MS = 5 * MINUTE_MS;

export function evaluateScanFreshness({
  generatedAt,
  nowMs = Date.now(),
  maxAgeMinutes = 105,
  staleAgeMinutes = 180,
  force = false,
}) {
  const generatedAtMs = Date.parse(generatedAt ?? "");
  const hasValidTimestamp = Number.isFinite(generatedAtMs) && generatedAtMs <= nowMs + MAX_CLOCK_SKEW_MS;
  const ageMinutes = hasValidTimestamp ? Math.max(0, Math.floor((nowMs - generatedAtMs) / MINUTE_MS)) : null;

  if (force) {
    return {
      shouldScan: true,
      stale: !hasValidTimestamp || (ageMinutes ?? 0) >= staleAgeMinutes,
      ageMinutes,
      lastScanAt: hasValidTimestamp ? new Date(generatedAtMs).toISOString() : null,
      reason: "manual dispatch",
    };
  }

  if (!hasValidTimestamp) {
    return {
      shouldScan: true,
      stale: true,
      ageMinutes: null,
      lastScanAt: null,
      reason: "missing or invalid generated_at",
    };
  }

  return {
    shouldScan: ageMinutes >= maxAgeMinutes,
    stale: ageMinutes >= staleAgeMinutes,
    ageMinutes,
    lastScanAt: new Date(generatedAtMs).toISOString(),
    reason: ageMinutes >= maxAgeMinutes ? "snapshot is due" : "snapshot is still fresh",
  };
}
