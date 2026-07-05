import { useState, useCallback, useEffect } from "react";
import type { TStorageProvider, TCloudSyncState } from "../lib/storage/types";
import type { TEntriesMap } from "../utils/types";
import { createGoogleDriveProvider } from "../lib/storage/googleDrive";
import { createDropboxProvider } from "../lib/storage/dropbox";
import { mergeEntries } from "../utils/appHelpers";

const PROVIDER_KEY = "mood-tracker.sync.provider";

export function useCloudSync(
  localEntries: TEntriesMap,
  setLocalEntries: (entries: TEntriesMap) => void
) {
  const [state, setState] = useState<TCloudSyncState>({
    provider: null,
    status: "idle",
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem(PROVIDER_KEY);
    if (saved === "googleDrive") {
      const provider = createGoogleDriveProvider();
      if (provider.isConnected()) setState((prev) => ({ ...prev, provider }));
    } else if (saved === "dropbox") {
      const provider = createDropboxProvider();
      if (provider.isConnected()) setState((prev) => ({ ...prev, provider }));
    }
  }, []);

  const connect = useCallback(async (providerType: "googleDrive" | "dropbox") => {
    const provider: TStorageProvider =
      providerType === "googleDrive" ? createGoogleDriveProvider() : createDropboxProvider();

    setState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      await provider.connect();
      localStorage.setItem(PROVIDER_KEY, providerType);
      setState((prev) => ({ ...prev, provider, status: "synced" }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    state.provider?.disconnect();
    localStorage.removeItem(PROVIDER_KEY);
    setState({ provider: null, status: "idle", lastSyncTime: null, error: null });
  }, [state.provider]);

  const sync = useCallback(async () => {
    if (!state.provider) return;

    setState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      const remoteEntries = await state.provider.load();
      const { mergedEntries } = mergeEntries(localEntries, remoteEntries);
      await state.provider.save(mergedEntries);
      setLocalEntries(mergedEntries);
      setState((prev) => ({ ...prev, status: "synced", lastSyncTime: new Date() }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    }
  }, [state.provider, localEntries, setLocalEntries]);

  return {
    ...state,
    connect,
    disconnect,
    sync,
    isConnected: state.provider !== null,
  };
}
