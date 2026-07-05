import type { TEntriesMap } from "../../utils/types";

export type TSyncStatus = "idle" | "syncing" | "synced" | "error";

export type TStorageProvider = {
  readonly name: "localStorage" | "googleDrive" | "dropbox";
  readonly displayName: string;

  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): void;
  load(): Promise<TEntriesMap>;
  save(entries: TEntriesMap): Promise<void>;
  getLastSyncTime(): Date | null;
};

export type TCloudSyncState = {
  provider: TStorageProvider | null;
  status: TSyncStatus;
  lastSyncTime: Date | null;
  error: string | null;
};
