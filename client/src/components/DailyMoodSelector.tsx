import type { CSSProperties } from "react";
import type { TMoodConfig, TMoodKey } from "../constants/moods";

type TProps = {
  moods: readonly TMoodConfig[];
  selectedMood: TMoodKey | null;
  onSelect: (mood: TMoodKey) => void;
};

const SelectorButtons = ({ moods, selectedMood, onSelect }: TProps) => (
  <div className="selector__options">
    {moods.map((mood) => {
      const isActive = selectedMood === mood.key;
      const style: CSSProperties & { "--mood-color"?: string } = { "--mood-color": mood.color };
      return (
        <button
          key={mood.key}
          type="button"
          className={`selector__button${isActive ? " selector__button--active" : ""}`}
          style={style}
          onClick={() => onSelect(mood.key)}
          aria-pressed={isActive}
        >
          <span className="selector__swatch" />
          <span className="selector__label">{mood.key}</span>
        </button>
      );
    })}
  </div>
);

type TDailyMoodSelectorProps = {
  moods: readonly TMoodConfig[];
  primaryMood: TMoodKey | null;
  secondaryMood: TMoodKey | null;
  isDual: boolean;
  isTodaySelection: boolean;
  note: string | null;
  onSelectPrimary: (mood: TMoodKey) => void;
  onSelectSecondary: (mood: TMoodKey) => void;
  onToggleDual: (checked: boolean) => void;
  onNoteChange: (note: string) => void;
  selectedDateLabel: string;
};

export const DailyMoodSelector = ({
  moods,
  primaryMood,
  secondaryMood,
  isDual,
  isTodaySelection,
  note,
  onSelectPrimary,
  onSelectSecondary,
  onToggleDual,
  onNoteChange,
  selectedDateLabel,
}: TDailyMoodSelectorProps) => (
  <section className="selector">
    <p className="selector__eyebrow">{isTodaySelection ? `Today · ${selectedDateLabel}` : selectedDateLabel}</p>
    <h1 className="selector__title">
      {isTodaySelection ? "How's your mood today?" : `Update mood for ${selectedDateLabel}`}
    </h1>

    <div className="selector__group">
      {isDual && <p className="selector__group-label">First half of the day</p>}
      <SelectorButtons moods={moods} selectedMood={primaryMood} onSelect={onSelectPrimary} />
    </div>

    <label className="selector__dual">
      <input
        type="checkbox"
        checked={isDual}
        onChange={(event) => onToggleDual(event.target.checked)}
        disabled={!primaryMood}
      />
      <span>Split this day between two moods</span>
    </label>

    {isDual && (
      <div className="selector__group">
        <p className="selector__group-label">Second half of the day</p>
        <SelectorButtons moods={moods} selectedMood={secondaryMood} onSelect={onSelectSecondary} />
      </div>
    )}

    <div className="selector__note-group">
      <label htmlFor="mood-note" className="selector__note-label">
        Add a note (optional)
      </label>
      <textarea
        id="mood-note"
        className="selector__note-input"
        value={note ?? ""}
        onChange={(e) => onNoteChange(e.target.value)}
        onBlur={(e) => {
          const trimmed = e.target.value.trim();
          if (trimmed !== (note ?? "")) onNoteChange(trimmed);
        }}
        placeholder="What made this day special? Any thoughts?"
        rows={3}
        maxLength={500}
      />
      {note && (
        <span className="selector__note-counter">
          {note.length}/500 characters
        </span>
      )}
    </div>

    <p className="selector__caption">Tap a color to capture today's vibe. We'll handle the rest.</p>
  </section>
);
