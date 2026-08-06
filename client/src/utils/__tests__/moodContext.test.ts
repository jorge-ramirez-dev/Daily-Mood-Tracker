import test from "node:test";
import assert from "node:assert/strict";
import { buildMoodContext } from "../moodContext";
import type { TEntriesMap } from "../types";

const SAMPLE_ENTRIES: TEntriesMap = {
  "2024-01-01": "Great",
  "2024-01-02": { first: "Good", second: "Bad" },
  "2024-02-10": { first: "Awful", note: "Rough day at work" },
  "2024-03-05": { first: "Okay", note: "Quiet Sunday" },
};

test("buildMoodContext emits per-year aggregates", () => {
  const context = buildMoodContext(SAMPLE_ENTRIES, { includeNotes: false });

  assert.match(context, /Year 2024: 4 days tracked\./);
  assert.match(context, /Mood counts:/);
  assert.match(context, /Great 1/);
  assert.match(context, /Average mood score:/);
  assert.match(context, /Best month:/);
  assert.match(context, /Toughest month:/);
});

test("buildMoodContext excludes notes by default", () => {
  const context = buildMoodContext(SAMPLE_ENTRIES, { includeNotes: false });

  assert.doesNotMatch(context, /DAILY NOTES/);
  assert.doesNotMatch(context, /Rough day at work/);
  assert.doesNotMatch(context, /Quiet Sunday/);
});

test("buildMoodContext includes notes only when opted in", () => {
  const context = buildMoodContext(SAMPLE_ENTRIES, { includeNotes: true });

  assert.match(context, /DAILY NOTES/);
  assert.match(context, /2024-02-10: Rough day at work/);
  assert.match(context, /2024-03-05: Quiet Sunday/);
});

test("buildMoodContext handles empty entries", () => {
  const context = buildMoodContext({}, { includeNotes: true });

  assert.match(context, /has not logged any mood entries/);
});

test("buildMoodContext omits the notes section when opted in but no notes exist", () => {
  const context = buildMoodContext({ "2024-05-01": "Good" }, { includeNotes: true });

  assert.doesNotMatch(context, /DAILY NOTES/);
});
