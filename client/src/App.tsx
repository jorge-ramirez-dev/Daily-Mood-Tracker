import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { MOODS, type TMoodKey } from "./constants/moods";
import type { TEntriesMap, TNormalizedEntry } from "./utils/types";
import { aggregateYearData, normalizeEntry, serializeEntry } from "./utils/data";
import { DailyMoodSelector } from "./components/DailyMoodSelector";
import { OverviewPanel } from "./components/OverviewPanel";
import { YearSelector } from "./components/YearSelector";
import {
  applyNoteConflictResolution,
  createBackupData,
  downloadBackup,
  formatTodayLabel,
  getAvailableYears,
  getTodayKey,
  getTotalDaysTracked,
  loadEntries,
  mergeEntries,
  parseBackupFile,
  saveEntries,
} from "./utils/appHelpers";
import { parseDateKey } from "./utils/dateHelpers";
import { SettingsMenu } from "./components/SettingsMenu";
import { ConfirmModal } from "./components/ConfirmModal";
import { CloudSyncSettings } from "./components/CloudSyncSettings";

type TModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const ENTRIES_STORAGE_KEY = "mood-tracker.daily.entries";
const CURRENT_YEAR = new Date().getFullYear();

const App = () => {
  const [entries, setEntries] = useState<TEntriesMap>(() =>
    loadEntries(typeof window === "undefined" ? null : window.localStorage, ENTRIES_STORAGE_KEY)
  );
  const [showOverview, setShowOverview] = useState(false);
  const todayKey = getTodayKey();
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const [showSync, setShowSync] = useState(false);
  const [modal, setModal] = useState<TModalState>({ isOpen: false, title: "", message: "" });
  const modalResolverRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((title: string, message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      modalResolverRef.current = resolve;
      setModal({ isOpen: true, title, message, confirmLabel, cancelLabel });
    });
  }, []);

  const handleModalConfirm = useCallback(() => {
    modalResolverRef.current?.(true);
    modalResolverRef.current = null;
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleModalCancel = useCallback(() => {
    modalResolverRef.current?.(false);
    modalResolverRef.current = null;
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const storage = typeof window === "undefined" ? null : window.localStorage;
    saveEntries(storage, ENTRIES_STORAGE_KEY, entries);
  }, [entries]);

  useEffect(() => {
    if (selectedDateKey === todayKey) return undefined;
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setSelectedDateKey(todayKey);
        return;
      }

      const isInsideInteractiveZone = target.closest(".year-grid") || target.closest(".selector");
      if (isInsideInteractiveZone) return;

      setSelectedDateKey(todayKey);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedDateKey, todayKey]);

  const availableYears = useMemo(() => getAvailableYears(entries, CURRENT_YEAR), [entries]);

  const selectedEntry: TNormalizedEntry = normalizeEntry(entries[selectedDateKey]) ?? {
    first: null,
    second: null,
    note: null,
  };
  const primaryMood = selectedEntry?.first ?? null;
  const secondaryMood = selectedEntry?.second ?? null;
  const noteText = selectedEntry?.note ?? null;
  const isDualDay = Boolean(selectedEntry?.second);

  const yearData = useMemo(() => aggregateYearData(entries, selectedYear), [entries, selectedYear]);
  const totalDaysTracked = useMemo(() => getTotalDaysTracked(entries, selectedYear), [entries, selectedYear]);

  const updateEntryForDate = (dateKey: string, updater: (entry: NonNullable<TNormalizedEntry>) => TNormalizedEntry) => {
    setEntries((prev) => {
      const normalized: NonNullable<TNormalizedEntry> = normalizeEntry(prev[dateKey]) ?? {
        first: null,
        second: null,
        note: null,
      };
      const next = updater(normalized);
      if (!next || (!next.first && !next.note)) {
        const { [dateKey]: _omitted, ...rest } = prev;
        return rest;
      }
      const serialized = serializeEntry(next);
      if (!serialized) {
        const { [dateKey]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dateKey]: serialized };
    });
  };

  const handlePrimarySelect = (moodKey: TMoodKey) => {
    updateEntryForDate(selectedDateKey, (entry) => {
      if (entry.first === moodKey) {
        return { first: null, second: null, note: entry.note };
      }
      return {
        first: moodKey,
        second: entry.second,
        note: entry.note,
      };
    });
  };

  const handleSecondarySelect = (moodKey: TMoodKey) => {
    updateEntryForDate(selectedDateKey, (entry) => {
      if (entry.second === moodKey) {
        return { first: entry.first, second: null, note: entry.note };
      }
      return {
        first: entry.first ?? moodKey,
        second: moodKey,
        note: entry.note,
      };
    });
  };

  const handleToggleDual = (checked: boolean) => {
    updateEntryForDate(selectedDateKey, (entry) => {
      if (!entry.first) return entry;
      return {
        first: entry.first,
        second: checked ? entry.second ?? entry.first : null,
        note: entry.note,
      };
    });
  };

  const handleNoteChange = (note: string) => {
    updateEntryForDate(selectedDateKey, (entry) => {
      return {
        first: entry.first,
        second: entry.second,
        note: note === "" ? null : note,
      };
    });
  };

  const selectedDateLabel = useMemo(() => formatTodayLabel(parseDateKey(selectedDateKey)), [selectedDateKey]);

  const handleBackup = () => {
    downloadBackup(createBackupData(entries));
  };

  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => {
      document.body.removeChild(input);
    };

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        cleanup();
        return;
      }

      try {
        const backupData = await parseBackupFile(file);
        const incomingCount = Object.keys(backupData.entries).length;

        const confirmRestore = await showConfirm(
          "Import Data",
          `This will merge ${incomingCount} entries with your current data. Moods will be updated, notes will be preserved unless you choose to overwrite.`,
          "Continue",
          "Cancel"
        );

        if (!confirmRestore) return;

        let { mergedEntries, noteConflicts } = mergeEntries(entries, backupData.entries);

        for (const conflict of noteConflicts) {
          const shouldOverwrite = await showConfirm(
            "Note Conflict",
            `Conflict on ${conflict.dateKey}:\n\nCurrent note:\n"${conflict.currentNote}"\n\nIncoming note:\n"${conflict.incomingNote}"`,
            "Use Incoming",
            "Keep Current"
          );

          if (shouldOverwrite) {
            mergedEntries = applyNoteConflictResolution(mergedEntries, conflict.dateKey, conflict.incomingNote);
          }
        }

        const storage = typeof window === "undefined" ? null : window.localStorage;
        if (!storage) return;

        storage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(mergedEntries));
        setEntries(mergedEntries);
        setSelectedYear(CURRENT_YEAR);
        setSelectedDateKey(todayKey);
        await showConfirm("Success", "Data merged successfully!", "OK");
      } catch (error) {
        await showConfirm("Error", `Failed to restore backup: ${error instanceof Error ? error.message : "Unknown error"}`, "OK");
      } finally {
        cleanup();
      }
    };

    input.oncancel = cleanup;
    input.click();
  };

  const handleClear = () => {
    setEntries({});
    setSelectedYear(CURRENT_YEAR);
    setSelectedDateKey(todayKey);
  };

  return (
    <div className="app">
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
      <SettingsMenu
        onBackup={handleBackup}
        onRestore={handleRestore}
        onClear={handleClear}
        onToggleSync={() => setShowSync((prev) => !prev)}
        entryCount={Object.keys(entries).length}
      />

      <div className="app__container">
        <DailyMoodSelector
          moods={MOODS}
          primaryMood={primaryMood}
          secondaryMood={secondaryMood}
          isDual={isDualDay}
          isTodaySelection={selectedDateKey === todayKey && selectedYear === CURRENT_YEAR}
          note={noteText}
          onSelectPrimary={handlePrimarySelect}
          onSelectSecondary={handleSecondarySelect}
          onToggleDual={handleToggleDual}
          onNoteChange={handleNoteChange}
          selectedDateLabel={selectedDateLabel}
        />

        <YearSelector
          selectedYear={selectedYear}
          availableYears={availableYears}
          currentYear={CURRENT_YEAR}
          onYearChange={setSelectedYear}
        />

        {showSync && <CloudSyncSettings entries={entries} setEntries={setEntries} />}

        <button type="button" className="overview-toggle" onClick={() => setShowOverview((prev) => !prev)}>
          {showOverview ? "Hide yearly overview" : "Show yearly overview"}
        </button>

        {showOverview && (
          <OverviewPanel
            data={yearData}
            totalDaysTracked={totalDaysTracked}
            entries={entries}
            year={selectedYear}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
          />
        )}
      </div>
    </div>
  );
};

export default App;
