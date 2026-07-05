type TYearSelectorProps = {
  selectedYear: number;
  availableYears: number[];
  currentYear: number;
  onYearChange: (year: number) => void;
};

export const YearSelector = ({ selectedYear, availableYears, currentYear, onYearChange }: TYearSelectorProps) => {
  if (availableYears.length <= 1) {
    return null;
  }

  return (
    <div className="year-selector">
      <select
        className="year-selector__dropdown"
        value={selectedYear}
        onChange={(e) => onYearChange(Number(e.target.value))}
        aria-label="Select year"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year === currentYear ? `This year (${year})` : year}
          </option>
        ))}
      </select>
      <svg className="year-selector__icon" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
