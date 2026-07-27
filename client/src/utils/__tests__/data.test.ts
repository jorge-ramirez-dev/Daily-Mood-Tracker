import test from "node:test";
import assert from "node:assert/strict";
import { aggregateYearData, areEntriesEqual, hasYearData, normalizeEntry, serializeEntry } from "../data";
import { StoredEntry } from "../types";

test("normalizeEntry handles strings and split objects", () => {
  assert.deepEqual(normalizeEntry("Good"), { first: "Good", second: null, note: null });

  assert.deepEqual(normalizeEntry({ first: "Okay", second: "Bad" }), { first: "Okay", second: "Bad", note: null });

  assert.deepEqual(normalizeEntry({ primary: "Great", secondary: "Good" }), { first: "Great", second: "Good", note: null });

  // When only a secondary mood is supplied, treat it as the primary mood.
  assert.deepEqual(normalizeEntry({ second: "Awful" }), { first: "Awful", second: null, note: null });

  assert.equal(normalizeEntry(null), null);
});

test("serializeEntry collapses to string when there is no split", () => {
  assert.equal(serializeEntry({ first: "Great", second: null, note: null }), "Great");
  assert.deepEqual(serializeEntry({ first: "Okay", second: "Bad", note: null }), { first: "Okay", second: "Bad" });
});

test("aggregateYearData counts whole and split days correctly", () => {
  const entries = {
    "2024-01-01": "Great",
    "2024-01-02": { first: "Good", second: "Bad" },
    "2024-02-10": { first: "Awful" },
    "2023-03-01": "Okay", // ignored because of year mismatch
  } as const satisfies Record<string, StoredEntry>;

  const aggregated = aggregateYearData(entries, 2024);
  const january = aggregated.find((row) => row.month === "Jan");
  const february = aggregated.find((row) => row.month === "Feb");

  assert.ok(january, "Expected January row to be present");
  assert.ok(february, "Expected February row to be present");

  assert.equal(january.Great, 1);
  assert.equal(january.Good, 0.5);
  assert.equal(january.Bad, 0.5);
  assert.equal(january.Awful, 0);

  assert.equal(february.Awful, 1);
});

test("hasYearData detects when any month has logged entries", () => {
  const emptyYear = aggregateYearData({}, 2024);
  assert.equal(hasYearData(emptyYear), false);

  const withData = aggregateYearData({ "2024-04-15": "Okay" }, 2024);
  assert.equal(hasYearData(withData), true);
});

test("normalizeEntry handles note field", () => {
  assert.deepEqual(
    normalizeEntry({ first: "Good", note: "Great day!" }),
    { first: "Good", second: null, note: "Great day!" }
  );

  assert.deepEqual(
    normalizeEntry({ first: "Okay", second: "Bad", note: "Mixed feelings" }),
    { first: "Okay", second: "Bad", note: "Mixed feelings" }
  );

  // Backward compatibility: entries without notes get note: null
  assert.deepEqual(
    normalizeEntry("Good"),
    { first: "Good", second: null, note: null }
  );

  assert.deepEqual(
    normalizeEntry({ first: "Great" }),
    { first: "Great", second: null, note: null }
  );
});

test("serializeEntry preserves note field", () => {
  // With note, always use object format
  assert.deepEqual(
    serializeEntry({ first: "Great", second: null, note: "Amazing!" }),
    { first: "Great", note: "Amazing!" }
  );

  assert.deepEqual(
    serializeEntry({ first: "Good", second: "Bad", note: "Mixed feelings" }),
    { first: "Good", second: "Bad", note: "Mixed feelings" }
  );

  // Without note, use compact format
  assert.equal(
    serializeEntry({ first: "Great", second: null, note: null }),
    "Great"
  );

  assert.deepEqual(
    serializeEntry({ first: "Good", second: "Bad", note: null }),
    { first: "Good", second: "Bad" }
  );
});

test("areEntriesEqual treats equivalent formats as equal", () => {
  // String vs object form of the same single mood.
  assert.equal(areEntriesEqual("Great", { first: "Great" }), true);

  // Legacy alias keys normalize to the same entry.
  assert.equal(areEntriesEqual({ primary: "Good", secondary: "Bad" }, { first: "Good", second: "Bad" }), true);

  // Identical note-bearing entries.
  assert.equal(
    areEntriesEqual({ first: "Okay", note: "abc" }, { first: "Okay", note: "abc" }),
    true
  );

  // Two empty entries.
  assert.equal(areEntriesEqual(null, null), true);
});

test("areEntriesEqual detects real differences", () => {
  // Different note.
  assert.equal(areEntriesEqual({ first: "Okay", note: "abc" }, { first: "Okay", note: "123" }), false);

  // Different mood.
  assert.equal(areEntriesEqual("Great", "Bad"), false);

  // Note present on one side only.
  assert.equal(areEntriesEqual({ first: "Good" }, { first: "Good", note: "hi" }), false);

  // One side empty.
  assert.equal(areEntriesEqual(null, "Good"), false);
});

test("aggregateYearData ignores note field", () => {
  const entries = {
    "2024-01-01": { first: "Great", note: "New year!" },
    "2024-01-02": "Good",
    "2024-01-03": { first: "Okay", second: "Bad", note: "Up and down" },
  } as const satisfies Record<string, StoredEntry>;

  const aggregated = aggregateYearData(entries, 2024);
  const january = aggregated.find((row) => row.month === "Jan");

  assert.ok(january, "Expected January row to be present");
  assert.equal(january.Great, 1);
  assert.equal(january.Good, 1);
  assert.equal(january.Okay, 0.5);
  assert.equal(january.Bad, 0.5);
  // Note should not affect aggregation
});
