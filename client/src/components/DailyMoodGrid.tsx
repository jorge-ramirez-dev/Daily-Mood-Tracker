import { useMemo, type CSSProperties } from "react";
import { MOODS, MONTHS, type TMoodKey, type TMonthLabel } from "../constants/moods";
import type { TNormalizedEntry, TStoredEntry } from "../utils/types";
import { normalizeEntry } from "../utils/data";

type TOrientation = "months-first" | "days-first";

type TDayCell = {
  day: number;
  dateKey: string | null;
  isDisabled: boolean;
  firstMoodKey: TMoodKey | null;
  secondMoodKey: TMoodKey | null;
  hasNote: boolean;
  isToday: boolean;
};

type TMonthData = {
  month: TMonthLabel;
  days: TDayCell[];
};

type TProps = {
  entries: Record<string, TStoredEntry>;
  year: number;
  todayKey: string;
  orientation?: TOrientation;
  selectedDateKey?: string;
  onSelectDate?: (dateKey: string) => void;
};

const colorMap: Record<TMoodKey, string> = Object.fromEntries(MOODS.map((mood) => [mood.key, mood.color])) as Record<
  TMoodKey,
  string
>;

const pad = (val: number) => String(val).padStart(2, "0");

const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const buildDay = (
  year: number,
  monthIndex: number,
  dayNumber: number,
  todayKey: string,
  entry: TNormalizedEntry
): TDayCell => {
  const dateKey = `${year}-${pad(monthIndex + 1)}-${pad(dayNumber)}`;
  return {
    day: dayNumber,
    dateKey,
    isDisabled: false,
    firstMoodKey: entry?.first ?? null,
    secondMoodKey: entry?.second ?? null,
    hasNote: Boolean(entry?.note),
    isToday: dateKey === todayKey,
  };
};

export const DailyMoodGrid = ({
  entries = {},
  year,
  todayKey,
  orientation = "months-first",
  selectedDateKey,
  onSelectDate,
}: TProps) => {
  const months = useMemo<TMonthData[]>(
    () =>
      MONTHS.map((month, monthIndex) => {
        const limit = daysInMonth(year, monthIndex);
        const days: TDayCell[] = Array.from({ length: 31 }, (_, dayIndex) => {
          const dayNumber = dayIndex + 1;
          if (dayNumber > limit) {
            return {
              day: dayNumber,
              dateKey: null,
              isDisabled: true,
              firstMoodKey: null,
              secondMoodKey: null,
              hasNote: false,
              isToday: false,
            };
          }

          const dateKey = `${year}-${pad(monthIndex + 1)}-${pad(dayNumber)}`;
          const normalized = normalizeEntry(entries[dateKey]);
          return buildDay(year, monthIndex, dayNumber, todayKey, normalized);
        });

        return { month, days };
      }),
    [entries, year, todayKey]
  );

  const renderCell = (monthLabel: TMonthLabel, day: TDayCell) => {
    const primaryColor = day.firstMoodKey ? colorMap[day.firstMoodKey] : "transparent";
    const secondaryColor =
      day.secondMoodKey && day.secondMoodKey !== day.firstMoodKey ? colorMap[day.secondMoodKey] : null;

    const isNoteOnly = !day.firstMoodKey && day.hasNote;

    let cellClass = "year-grid__cell";
    if (day.isDisabled) cellClass += " year-grid__cell--disabled";
    else if (isNoteOnly) cellClass += " year-grid__cell--note-only";
    else if (!day.firstMoodKey) cellClass += " year-grid__cell--empty";
    const activeKey = selectedDateKey ?? todayKey;
    const isSelected = Boolean(activeKey && day.dateKey && activeKey === day.dateKey);
    if (day.isToday) cellClass += " year-grid__cell--today";
    if (isSelected) cellClass += " year-grid__cell--selected";
    if (secondaryColor) cellClass += " year-grid__cell--split";

    const style: CSSProperties =
      secondaryColor != null
        ? ({
            "--primary-color": primaryColor,
            "--secondary-color": secondaryColor,
          } as CSSProperties)
        : { background: day.firstMoodKey ? primaryColor : undefined };

    const title = day.isDisabled
      ? "N/A"
      : day.firstMoodKey
      ? secondaryColor
        ? `${monthLabel} ${day.day}: ${day.firstMoodKey} · ${day.secondMoodKey}`
        : `${monthLabel} ${day.day}: ${day.firstMoodKey}`
      : isNoteOnly
      ? `${monthLabel} ${day.day}: note`
      : `${monthLabel} ${day.day}: no entry`;

    const isInteractive = Boolean(onSelectDate) && !day.isDisabled && Boolean(day.dateKey);
    const handleSelect = () => {
      if (!isInteractive || !day.dateKey) return;
      onSelectDate?.(day.dateKey);
    };

    return (
      <button
        key={`${monthLabel}-${day.day}`}
        type="button"
        className={cellClass}
        title={title}
        style={style}
        onClick={isInteractive ? handleSelect : undefined}
        aria-pressed={isInteractive ? isSelected : undefined}
        disabled={day.isDisabled}
      />
    );
  };

  const renderMonthsFirst = () => (
    <div className="year-grid__table" style={{ gridTemplateColumns: `90px repeat(31, minmax(26px, 1fr))` }}>
      <div className="year-grid__corner">Month</div>
      {Array.from({ length: 31 }, (_, i) => (
        <div key={`day-header-${i + 1}`} className="year-grid__day-header">
          {i + 1}
        </div>
      ))}

      {months.map(({ month, days }) => (
        <div key={`year-month-${month}`} className="year-grid__row">
          <div className="year-grid__month">{month}</div>
          {days.map((day) => renderCell(month, day))}
        </div>
      ))}
    </div>
  );

  const renderDaysFirst = () => (
    <div
      className="year-grid__table"
      style={{ gridTemplateColumns: `70px repeat(${MONTHS.length}, minmax(48px, 1fr))` }}
    >
      <div className="year-grid__corner">Day</div>
      {MONTHS.map((month) => (
        <div key={`month-header-${month}`} className="year-grid__day-header">
          {month}
        </div>
      ))}

      {Array.from({ length: 31 }, (_, dayIndex) => (
        <div key={`day-row-${dayIndex + 1}`} className="year-grid__row">
          <div className="year-grid__month">{dayIndex + 1}</div>
          {months.map(({ month, days }) => renderCell(month, days[dayIndex]))}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`year-grid year-grid--${orientation}`}>
      <div
        className={`year-grid__viewport year-grid__viewport--months ${
          orientation === "months-first" ? "year-grid__viewport--active" : ""
        }`}
      >
        {renderMonthsFirst()}
      </div>
      <div
        className={`year-grid__viewport year-grid__viewport--days ${
          orientation === "days-first" ? "year-grid__viewport--active" : ""
        }`}
      >
        {renderDaysFirst()}
      </div>
    </div>
  );
};
