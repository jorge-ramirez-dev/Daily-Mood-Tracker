import { MOODS } from "../constants/moods";
import { MOOD_WEIGHTS } from "../constants/moodWeights";
import type { TAggregatedRow } from "../utils/types";

type TProps = {
  data: TAggregatedRow[];
  totalDaysTracked: number;
  year: number;
};

const isCompletedMonth = (trackedDays: number, monthIndex: number, year: number) => {
  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return trackedDays >= totalDaysInMonth;
};

export const InsightPills = ({ data, totalDaysTracked, year }: TProps) => {
  if (!data.length) return null;

  const scored = data
    .map((row) => {
      const totalDays = MOODS.reduce((sum, mood) => sum + row[mood.key], 0);
      if (totalDays === 0) return { month: row.month, score: Number.NEGATIVE_INFINITY };
      const weighted = MOODS.reduce((sum, mood) => sum + row[mood.key] * (MOOD_WEIGHTS[mood.key] ?? 0), 0);
      return {
        month: row.month,
        score: weighted / totalDays,
        trackedDays: totalDays,
        isCompleted: isCompletedMonth(totalDays, row.monthIndex, year),
      };
    })
    .filter((entry) => Number.isFinite(entry.score));

  if (!scored.length) {
    return (
      <div className="pills pills--empty">
        <span className="pill pill--neutral">Log a few days to unlock insights.</span>
      </div>
    );
  }

  const completed = scored.filter((entry) => entry.isCompleted);
  const bestPool = completed.length ? completed : scored;
  const best = bestPool.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));

  const worstPool = completed.length ? completed : scored;
  const worst = worstPool.reduce((prev, curr) => (curr.score < prev.score ? curr : prev));

  return (
    <div className="pills">
      <span className="pill pill--best">
        Best: {best.month} (avg {best.score.toFixed(2)})
      </span>
      <span className="pill pill--tough">
        Toughest: {worst.month} (avg {worst.score.toFixed(2)})
      </span>
      <span className="pill pill--neutral">Total days tracked: {totalDaysTracked}</span>
    </div>
  );
};
