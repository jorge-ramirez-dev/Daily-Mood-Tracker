import { TMonthLabel, TMoodKey } from "../constants/moods";

export type TStoredEntry =
  | null
  | TMoodKey
  | {
      first?: TMoodKey | null;
      second?: TMoodKey | null;
      primary?: TMoodKey | null;
      secondary?: TMoodKey | null;
      mood?: TMoodKey | null;
      note?: string | null;
    };

export type TNormalizedEntry = { first: TMoodKey | null; second: TMoodKey | null; note: string | null } | null;

export type TAggregatedRow = {
  month: TMonthLabel;
  monthIndex: number;
} & Record<TMoodKey, number>;

export type TEntriesMap = Record<string, TStoredEntry>;
