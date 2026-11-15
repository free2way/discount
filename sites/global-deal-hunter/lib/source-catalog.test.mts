import assert from "node:assert/strict";
import test from "node:test";
import { FEED_SOURCE_DEFINITIONS } from "./feed-sources.mts";
import { SOURCE_CATALOG, sourceIdForName } from "./source-catalog.ts";

test("source center documents every active scanner source", () => {
  const catalogIds = new Set(SOURCE_CATALOG.map((source) => source.id));
  assert.equal(catalogIds.size, SOURCE_CATALOG.length);
  for (const source of FEED_SOURCE_DEFINITIONS) assert.ok(catalogIds.has(source.id), source.id);
});

test("source names and legacy aliases resolve to stable ids", () => {
  assert.equal(sourceIdForName("LINUX DO 福利羊毛"), "linuxdo");
  assert.equal(sourceIdForName("NodeSeek"), "nodeseek");
  assert.equal(sourceIdForName("unknown"), null);
});
