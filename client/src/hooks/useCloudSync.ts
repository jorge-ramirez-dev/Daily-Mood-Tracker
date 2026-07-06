import { useState, useCallback, useEffect } from "react";
import type { TStorageProvider, TCloudSyncState } from "../lib/storage/types";
import type { TEntriesMap } from "../utils/types";
import { createGoogleDriveProvider } from "../lib/storage/googleDrive";
import { createDropboxProvider } from "../lib/storage/dropbox";

const PROVIDER_KEY = "mood-tracker.sync.provider";

export function useCloudSync(localEntries: TEntriesMap) {
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

  const backup = useCallback(async () => {
    if (!state.provider) return;

    setState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      await state.provider.save(localEntries);
      setState((prev) => ({ ...prev, status: "synced", lastSyncTime: new Date() }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Backup failed",
      }));
    }
  }, [state.provider, localEntries]);

  const restore = useCallback(async (): Promise<TEntriesMap | null> => {
    if (!state.provider) return null;

    setState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      const remoteEntries = await state.provider.load();
      setState((prev) => ({ ...prev, status: "synced", lastSyncTime: new Date() }));
      return remoteEntries;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Restore failed",
      }));
      return null;
    }
  }, [state.provider]);

  return {
    ...state,
    connect,
    disconnect,
    backup,
    restore,
    isConnected: state.provider !== null,
  };
}
