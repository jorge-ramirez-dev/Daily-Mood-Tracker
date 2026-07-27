import test from "node:test";
import assert from "node:assert/strict";
import {
  applyEntryConflictResolution,
  formatEntryForConflict,
  formatTodayLabel,
  getTodayKey,
  loadEntries,
  mergeEntries,
  saveEntries,
} from "../appHelpers";
import type { TEntriesMap } from "../types";

const createMockStorage = (initial: Record<string, string> = {}) => {
  const store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    dump: () => ({ ...store }),
  } as const;
};

test("getTodayKey returns ISO date adjusted for timezone", () => {
  const mockDate = new Date("2024-03-05T12:00:00Z");
  // Use same date regardless of runtime timezone by passing explicit Date
  const key = getTodayKey(mockDate);
  assert.equal(key, "2024-03-05");
});

test("formatTodayLabel formats using en-US long form", () => {
  const mockDate = new Date("2024-10-10T09:00:00Z");
  const label = formatTodayLabel(mockDate);
  assert.equal(label, "Thursday, October 10");
});

test("loadEntries returns empty object when storage empty or missing", () => {
  const storage = createMockStorage();
  assert.deepEqual(loadEntries(storage, "key"), {});

  assert.deepEqual(loadEntries(null, "key"), {});
});

test("loadEntries parses stored data when available", () => {
  const stored: TEntriesMap = { "2024-02-01": "Good" };
  const storage = createMockStorage({ key: JSON.stringify(stored) });
  const result = loadEntries(storage, "key");
  assert.deepEqual(result, stored);
});

test("saveEntries writes JSON to storage", () => {
  const storage = createMockStorage();
  const entries: TEntriesMap = { "2024-03-02": { first: "Okay", second: "Good" } };
  saveEntries(storage, "entries", entries);
  assert.deepEqual(storage.dump(), { entries: JSON.stringify(entries) });
});

test("saveEntries and loadEntries handle note field", () => {
  const storage = createMockStorage();
  const entries: TEntriesMap = {
    "2024-03-02": {
      first: "Okay",
      second: "Good",
      note: "Had a productive afternoon"
    }
  };

  saveEntries(storage, "entries", entries);
  const loaded = loadEntries(storage, "entries");

  assert.deepEqual(loaded, entries);
  const entry = loaded["2024-03-02"];
  if (entry && typeof entry === "object" && "note" in entry) {
    assert.equal(entry.note, "Had a productive afternoon");
  } else {
    assert.fail("Expected entry to have note field");
  }
});

test("mergeEntries skips identical entries without overwriting", () => {
  const current: TEntriesMap = { "2024-01-01": { first: "Good", note: "abc" }, "2024-01-02": "Bad" };
  const incoming: TEntriesMap = { "2024-01-01": { first: "Good", note: "abc" }, "2024-01-02": "Bad" };

  const { mergedEntries, conflicts, stats } = mergeEntries(current, incoming);

  assert.equal(conflicts.length, 0);
  assert.deepEqual(stats, { added: 0, unchanged: 2, conflicts: 0 });
  // The exact same object references are preserved — nothing was rewritten.
  assert.equal(mergedEntries["2024-01-01"], current["2024-01-01"]);
  assert.equal(mergedEntries["2024-01-02"], current["2024-01-02"]);
});

test("mergeEntries adds entries missing locally without prompting", () => {
  const current: TEntriesMap = {};
  const incoming: TEntriesMap = { "2024-01-01": { first: "Good", note: "abc" } };

  const { mergedEntries, conflicts, stats } = mergeEntries(current, incoming);

  assert.equal(conflicts.length, 0);
  assert.deepEqual(stats, { added: 1, unchanged: 0, conflicts: 0 });
  assert.deepEqual(mergedEntries["2024-01-01"], { first: "Good", note: "abc" });
});

test("mergeEntries surfaces a conflict when the note differs", () => {
  const current: TEntriesMap = { "2024-01-01": { first: "Good", note: "abc" } };
  const incoming: TEntriesMap = { "2024-01-01": { first: "Good", note: "123" } };

  const { mergedEntries, conflicts, stats } = mergeEntries(current, incoming);

  assert.equal(conflicts.length, 1);
  assert.deepEqual(stats, { added: 0, unchanged: 0, conflicts: 1 });
  assert.equal(conflicts[0].dateKey, "2024-01-01");
  assert.deepEqual(conflicts[0].current, { first: "Good", second: null, note: "abc" });
  assert.deepEqual(conflicts[0].incoming, { first: "Good", second: null, note: "123" });
  // Local value is kept until the user resolves the conflict.
  assert.deepEqual(mergedEntries["2024-01-01"], { first: "Good", note: "abc" });
});

test("mergeEntries surfaces a conflict when only the mood differs", () => {
  const current: TEntriesMap = { "2024-01-01": "Good" };
  const incoming: TEntriesMap = { "2024-01-01": "Bad" };

  const { conflicts, stats } = mergeEntries(current, incoming);

  assert.equal(conflicts.length, 1);
  assert.equal(stats.conflicts, 1);
});

test("applyEntryConflictResolution replaces the whole entry with the incoming one", () => {
  const entries: TEntriesMap = { "2024-01-01": { first: "Good", note: "abc" } };
  const resolved = applyEntryConflictResolution(entries, "2024-01-01", {
    first: "Bad",
    second: null,
    note: "123",
  });

  assert.deepEqual(resolved["2024-01-01"], { first: "Bad", note: "123" });
  // Original object is not mutated.
  assert.deepEqual(entries["2024-01-01"], { first: "Good", note: "abc" });
});

test("formatEntryForConflict renders moods and note", () => {
  assert.equal(formatEntryForConflict({ first: "Good", second: null, note: "abc" }), 'Good — "abc"');
  assert.equal(formatEntryForConflict({ first: "Good", second: "Bad", note: null }), "Good + Bad");
  assert.equal(formatEntryForConflict({ first: null, second: null, note: "note only" }), 'No mood — "note only"');
  assert.equal(formatEntryForConflict(null), "(empty)");
});
