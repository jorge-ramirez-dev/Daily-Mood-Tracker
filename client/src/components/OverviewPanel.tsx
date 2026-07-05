import { useState } from "react";
import { MoodLegend } from "./MoodLegend";
import { InsightPills } from "./InsightPills";
import { MonthlyMoodAccumulation } from "./MonthlyMoodAccumulation";
import { MonthlyMoodChart } from "./MonthlyMoodChart";
import { DailyMoodGrid } from "./DailyMoodGrid";
import type { TAggregatedRow, TStoredEntry } from "../utils/types";
import { hasYearData } from "../utils/data";

type TOrientation = "months-first" | "days-first";

type TProps = {
  data: TAggregatedRow[];
  totalDaysTracked: number;
  entries: Record<string, TStoredEntry>;
  year: number;
  todayKey: string;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
};

export const OverviewPanel = ({
  data,
  totalDaysTracked,
  entries,
  year,
  todayKey,
  selectedDateKey,
  onSelectDate,
}: TProps) => {
  const [orientation, setOrientation] = useState<TOrientation>("months-first");
  const hasData = hasYearData(data);
  const toggleOrientation = () => setOrientation((prev) => (prev === "months-first" ? "days-first" : "months-first"));
  const toggleLabel = orientation === "months-first" ? "Switch to 31×12" : "Switch to 12×31";
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  return (
    <section className="overview">
      <header className="overview__header">
        <div>
          <p className="overview__eyebrow">{isCurrentYear ? "This year" : year}</p>
          <h2 className="overview__title">{isCurrentYear ? "Mood overview" : `${year} overview`}</h2>
        </div>
        <MoodLegend />
      </header>

      <InsightPills data={data} totalDaysTracked={totalDaysTracked} year={year} />

      {hasData ? (
        <>
          <div className="overview__panel">
            <div className="overview__panel-header">
              <h3 className="section-title">Year at a glance</h3>
              <button type="button" className="year-grid__toggle" onClick={toggleOrientation}>
                {toggleLabel}
              </button>
            </div>
            <DailyMoodGrid
              entries={entries}
              year={year}
              todayKey={todayKey}
              orientation={orientation}
              selectedDateKey={selectedDateKey}
              onSelectDate={onSelectDate}
            />
          </div>
          <div className="overview__panel">
            <MonthlyMoodAccumulation data={data} year={year} />
          </div>
          <div className="overview__panel">
            <h3 className="section-title">Distribution by month</h3>
            <MonthlyMoodChart data={data} />
          </div>
        </>
      ) : (
        <p className="overview__empty">Add a few entries to unlock the yearly insights.</p>
      )}
    </section>
  );
};
