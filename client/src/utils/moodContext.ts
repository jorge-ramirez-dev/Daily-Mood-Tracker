import { MOODS, type TMonthLabel } from "../constants/moods";
import { MOOD_WEIGHTS } from "../constants/moodWeights";
import { aggregateYearData, normalizeEntry } from "./data";
import { getAvailableYears, getTotalDaysTracked } from "./appHelpers";
import type { TAggregatedRow, TEntriesMap } from "./types";

export type TBuildMoodContextOptions = { includeNotes: boolean };

type TNoteLine = { date: string; text: string };
type TMonthAverage = { month: TMonthLabel; average: number; days: number };

// Total logged days represented in a month row (split days sum to 1).
const monthDays = (row: TAggregatedRow): number =>
  MOODS.reduce((sum, mood) => sum + row[mood.key], 0);

// Weighted mood score averaged across the given rows; higher is better.
const weightedAverage = (rows: TAggregatedRow[]): number => {
  let weightedSum = 0;
  let totalCount = 0;
  for (const row of rows) {
    for (const mood of MOODS) {
      const count = row[mood.key];
      weightedSum += count * MOOD_WEIGHTS[mood.key];
      totalCount += count;
    }
  }
  if (totalCount === 0) return 0;
  return weightedSum / totalCount;
};

const buildYearSummary = (entries: TEntriesMap, year: number): string => {
  const rows = aggregateYearData(entries, year);
  const totalDays = getTotalDaysTracked(entries, year);

  const moodCounts = MOODS.map((mood) => {
    const count = rows.reduce((sum, row) => sum + row[mood.key], 0);
    return `${mood.key} ${Math.round(count * 100) / 100}`;
  }).join(", ");

  const overallAverage = weightedAverage(rows);

  const monthAverages: TMonthAverage[] = rows
    .map((row) => ({ month: row.month, average: weightedAverage([row]), days: monthDays(row) }))
    .filter((entry) => entry.days > 0);

  const best = monthAverages.reduce((leader, entry) => (entry.average > leader.average ? entry : leader));
  const toughest = monthAverages.reduce((leader, entry) => (entry.average < leader.average ? entry : leader));

  return [
    `Year ${year}: ${totalDays} days tracked.`,
    `  Mood counts: ${moodCounts}.`,
    `  Average mood score: ${overallAverage.toFixed(2)} (range ${MOOD_WEIGHTS.Awful} to ${MOOD_WEIGHTS.Great}, higher is better).`,
    `  Best month: ${best.month} (avg ${best.average.toFixed(2)}). Toughest month: ${toughest.month} (avg ${toughest.average.toFixed(2)}).`,
  ].join("\n");
};

const collectNotes = (entries: TEntriesMap): TNoteLine[] => {
  const notes: TNoteLine[] = [];
  for (const date of Object.keys(entries).sort()) {
    const note = normalizeEntry(entries[date])?.note;
    if (!note) continue;
    notes.push({ date, text: note });
  }
  return notes;
};

// Builds the compact aggregate context sent as the LLM system prompt. Reuses the
// app's existing aggregation so stats never drift from what the UI shows. Raw
// entries are never emitted; daily notes are appended only when opted in.
export const buildMoodContext = (entries: TEntriesMap, options: TBuildMoodContextOptions): string => {
  const currentYear = new Date().getFullYear();
  const years = getAvailableYears(entries, currentYear).filter(
    (year) => getTotalDaysTracked(entries, year) > 0
  );

  if (years.length === 0) {
    return "The user has not logged any mood entries yet.";
  }

  const lines: string[] = [
    "MOOD DATA SUMMARY",
    `Mood scale (weight): ${MOODS.map((mood) => `${mood.key}=${MOOD_WEIGHTS[mood.key]}`).join(", ")}.`,
    "Split days count as half toward each of two moods.",
    "",
  ];

  for (const year of years) {
    lines.push(buildYearSummary(entries, year));
  }

  if (options.includeNotes) {
    const notes = collectNotes(entries);
    if (notes.length > 0) {
      lines.push("", "DAILY NOTES (user opted in to share these):");
      for (const note of notes) {
        lines.push(`- ${note.date}: ${note.text}`);
      }
    }
  }

  return lines.join("\n");
};
