import type { TEntriesMap } from "./types";
import { normalizeEntry, serializeEntry } from "./data";

export const getTodayKey = (date: Date = new Date()): string => {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  return localISO;
};

export const formatTodayLabel = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date);

type TStorageLike = Pick<Storage, "getItem" | "setItem"> | null;

export const loadEntries = (storage: TStorageLike, storageKey: string): TEntriesMap => {
  if (!storage) return {};
  try {
    const stored = storage.getItem(storageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as TEntriesMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveEntries = (storage: TStorageLike, storageKey: string, entries: TEntriesMap): void => {
  if (!storage) return;
  storage.setItem(storageKey, JSON.stringify(entries));
};

export const getAvailableYears = (entries: TEntriesMap, currentYear: number): number[] => {
  const years = new Set<number>();
  Object.keys(entries).forEach((key) => {
    const year = new Date(key).getFullYear();
    if (!Number.isNaN(year)) years.add(year);
  });
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
};

export const getTotalDaysTracked = (entries: TEntriesMap, year: number): number => {
  return Object.entries(entries).filter(([date, value]) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year) return false;
    const normalized = normalizeEntry(value);
    return Boolean(normalized?.first);
  }).length;
};

export type TBackupData = {
  version: string;
  exportDate: string;
  entries: TEntriesMap;
};

export const createBackupData = (entries: TEntriesMap): TBackupData => ({
  version: "1.0",
  exportDate: new Date().toISOString(),
  entries,
});

export const downloadBackup = (data: TBackupData): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mood-tracker-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export type TNoteConflict = {
  dateKey: string;
  currentNote: string;
  incomingNote: string;
};

export type TMergeResult = {
  mergedEntries: TEntriesMap;
  noteConflicts: TNoteConflict[];
};

export const parseBackupFile = async (file: File): Promise<TBackupData> => {
  if (!file.name.endsWith(".json")) {
    throw new Error("Please select a valid JSON file");
  }

  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.entries || typeof data.entries !== "object") {
    throw new Error("Invalid backup file format: missing or invalid entries");
  }

  return data as TBackupData;
};

export const mergeEntries = (currentEntries: TEntriesMap, incomingEntries: TEntriesMap): TMergeResult => {
  const noteConflicts: TNoteConflict[] = [];
  const mergedEntries = { ...currentEntries };

  for (const dateKey of Object.keys(incomingEntries)) {
    const incomingRaw = incomingEntries[dateKey];
    const incomingNormalized = normalizeEntry(incomingRaw);

    if (!incomingNormalized?.first && !incomingNormalized?.note) continue;

    const currentRaw = mergedEntries[dateKey];
    const currentNormalized = normalizeEntry(currentRaw);

    let finalNote: string | null = currentNormalized?.note ?? null;
    const incomingNote = incomingNormalized.note;

    if (incomingNote) {
      if (!finalNote) {
        finalNote = incomingNote;
      } else if (finalNote !== incomingNote) {
        noteConflicts.push({
          dateKey,
          currentNote: finalNote,
          incomingNote,
        });
      }
    }

    const merged = serializeEntry({
      first: incomingNormalized.first,
      second: incomingNormalized.second,
      note: finalNote,
    });

    if (merged) {
      mergedEntries[dateKey] = merged;
    }
  }

  return { mergedEntries, noteConflicts };
};

export const applyNoteConflictResolution = (
  entries: TEntriesMap,
  dateKey: string,
  newNote: string
): TEntriesMap => {
  const currentEntry = normalizeEntry(entries[dateKey]);
  if (!currentEntry) return entries;

  const updated = serializeEntry({
    first: currentEntry.first,
    second: currentEntry.second,
    note: newNote,
  });

  if (!updated) return entries;

  return { ...entries, [dateKey]: updated };
};
