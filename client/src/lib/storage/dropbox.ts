import { Dropbox, DropboxAuth } from "dropbox";
import type { TStorageProvider } from "./types";
import type { TEntriesMap } from "../../utils/types";

const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID as string;
const DATA_FILE_PATH = "/mood-tracker-data.json";

const TOKEN_KEY = "mood-tracker.dropbox.token";
const CODE_VERIFIER_KEY = "mood-tracker.dropbox.verifier";

export function createDropboxProvider(): TStorageProvider {
  const dbxAuth = new DropboxAuth({ clientId: CLIENT_ID });
  let dbx: Dropbox | null = null;
  let lastSyncTime: Date | null = null;

  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (storedToken) {
    dbxAuth.setAccessToken(storedToken);
    dbx = new Dropbox({ auth: dbxAuth });
  }

  return {
    name: "dropbox" as const,
    displayName: "Dropbox",

    isConnected: () => dbx !== null,

    connect: async () => {
      const redirectUri = `${window.location.origin}/auth/dropbox/callback`;
      const authUrl = await dbxAuth.getAuthenticationUrl(
        redirectUri,
        undefined,
        "code",
        "offline",
        undefined,
        undefined,
        true // usePKCE
      );
      const codeVerifier = dbxAuth.getCodeVerifier();
      sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
      window.location.href = authUrl.toString();
    },

    disconnect: () => {
      dbxAuth.setAccessToken("");
      dbx = null;
      localStorage.removeItem(TOKEN_KEY);
    },

    load: async () => {
      if (!dbx) throw new Error("Not connected to Dropbox");
      try {
        const response = await dbx.filesDownload({ path: DATA_FILE_PATH });
        const blob = (response.result as { fileBlob: Blob }).fileBlob;
        const text = await blob.text();
        lastSyncTime = new Date();
        return JSON.parse(text) as TEntriesMap;
      } catch (error: unknown) {
        const err = error as { error?: { error?: { ".tag"?: string; path?: { ".tag"?: string } } } };
        if (err?.error?.error?.[".tag"] === "path" && err?.error?.error?.path?.[".tag"] === "not_found") {
          return {};
        }
        throw error;
      }
    },

    save: async (entries: TEntriesMap) => {
      if (!dbx) throw new Error("Not connected to Dropbox");
      await dbx.filesUpload({
        path: DATA_FILE_PATH,
        contents: JSON.stringify(entries, null, 2),
        mode: { ".tag": "overwrite" },
      });
      lastSyncTime = new Date();
    },

    getLastSyncTime: () => lastSyncTime,
  };
}
