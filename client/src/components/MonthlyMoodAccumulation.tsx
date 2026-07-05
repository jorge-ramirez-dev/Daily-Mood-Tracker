import { Fragment, useMemo } from "react";
import { MOODS, type TMoodKey } from "../constants/moods";
import type { TAggregatedRow } from "../utils/types";

const formatValue = (value: number) => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1).replace(/\.0$/, "");
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const getTextColor = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#0f172a" : "#fff";
};

const mixWithWhite = (hex: string, ratio: number) => {
  const { r, g, b } = hexToRgb(hex);
  const mixChannel = (channel: number) => Math.round(channel + (255 - channel) * (1 - ratio));
  const blended = { r: mixChannel(r), g: mixChannel(g), b: mixChannel(b) };
  return { background: `rgb(${blended.r}, ${blended.g}, ${blended.b})`, textColor: getTextColor(blended) };
};

const getSolidColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  return { background: hex, textColor: getTextColor(rgb) };
};

const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

type TProps = {
  data: TAggregatedRow[];
  year: number;
};

export const MonthlyMoodAccumulation = ({ data, year }: TProps) => {
  const monthLengths = useMemo(() => data.map((row) => daysInMonth(year, row.monthIndex)), [data, year]);
  const totals = useMemo(() => {
    const sums = {} as Record<TMoodKey, number>;
    MOODS.forEach((mood) => {
      sums[mood.key] = data.reduce((sum, row) => sum + row[mood.key], 0);
    });
    return sums;
  }, [data]);

  return (
    <div className="grid-wrapper">
      <div className="grid" style={{ gridTemplateColumns: `84px repeat(${MOODS.length}, minmax(68px, 1fr))` }}>
        <div className="grid__spacer" />
        {MOODS.map((mood) => (
          <div key={mood.key} className="grid__header">
            {mood.key}
          </div>
        ))}
        {data.map((row, rowIndex) => (
          <Fragment key={row.month}>
            <div className="grid__month">{row.month}</div>
            {MOODS.map((mood) => {
              const value = row[mood.key];
              const limit = monthLengths[rowIndex] || daysInMonth(year, row.monthIndex);
              const ratio = limit === 0 ? 0 : value / limit;
              const colors =
                ratio === 0
                  ? { background: "rgba(148,163,184,0.15)", textColor: "#0f172a" }
                  : mixWithWhite(mood.color, Math.max(ratio, 0.2));

              return (
                <div
                  key={`${row.month}-${mood.key}`}
                  className="grid__cell"
                  style={{ background: colors.background }}
                  title={`${row.month} – ${mood.key}: ${value} day${value === 1 ? "" : "s"}`}
                >
                  <span className="grid__value" style={{ color: colors.textColor }}>
                    {formatValue(value)}
                  </span>
                </div>
              );
            })}
          </Fragment>
        ))}
        <div className="grid__month grid__month--total">Total</div>
        {MOODS.map((mood) => {
          const value = totals[mood.key] ?? 0;
          const colors = getSolidColor(mood.color);
          return (
            <div
              key={`total-${mood.key}`}
              className="grid__cell grid__cell--total"
              style={{ background: colors.background }}
              title={`Total – ${mood.key}: ${value} day${value === 1 ? "" : "s"}`}
            >
              <span className="grid__value" style={{ color: colors.textColor }}>
                {formatValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
