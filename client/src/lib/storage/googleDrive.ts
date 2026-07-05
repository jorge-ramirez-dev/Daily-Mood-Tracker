import type { TStorageProvider } from "./types";
import type { TEntriesMap } from "../../utils/types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const DATA_FILE_NAME = "mood-tracker-data.json";

const TOKEN_KEY = "mood-tracker.google.token";
const TOKEN_EXPIRY_KEY = "mood-tracker.google.expiry";

export function createGoogleDriveProvider(): TStorageProvider {
  let accessToken: string | null = null;
  let tokenClient: google.accounts.oauth2.TokenClient | null = null;
  let lastSyncTime: Date | null = null;

  const storedToken = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (storedToken && expiry && Date.now() < parseInt(expiry)) {
    accessToken = storedToken;
  }

  const loadGisScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof google !== "undefined" && google.accounts) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const loadGapiScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof gapi !== "undefined" && gapi.client) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        gapi.load("client", async () => {
          await gapi.client.init({});
          await gapi.client.load("drive", "v3");
          resolve();
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const findDataFile = async (): Promise<string | null> => {
    const response = await gapi.client.drive.files.list({
      spaces: "appDataFolder",
      q: `name = '${DATA_FILE_NAME}'`,
      fields: "files(id)",
    });
    const files = response.result.files;
    return files && files.length > 0 ? (files[0].id ?? null) : null;
  };

  return {
    name: "googleDrive" as const,
    displayName: "Google Drive",

    isConnected: () => accessToken !== null,

    connect: async () => {
      await loadGisScript();
      await loadGapiScript();

      return new Promise((resolve, reject) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            accessToken = response.access_token;
            const expiryTime = Date.now() + response.expires_in * 1000;
            localStorage.setItem(TOKEN_KEY, response.access_token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
            gapi.client.setToken({ access_token: response.access_token });
            resolve();
          },
        });
        tokenClient.requestAccessToken();
      });
    },

    disconnect: () => {
      if (accessToken) {
        google.accounts.oauth2.revoke(accessToken);
      }
      accessToken = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    },

    load: async () => {
      if (!accessToken) throw new Error("Not connected to Google Drive");
      const fileId = await findDataFile();
      if (!fileId) return {};
      const response = await gapi.client.drive.files.get({ fileId, alt: "media" });
      lastSyncTime = new Date();
      return JSON.parse(response.body) as TEntriesMap;
    },

    save: async (entries: TEntriesMap) => {
      if (!accessToken) throw new Error("Not connected to Google Drive");
      const content = JSON.stringify(entries);
      const fileId = await findDataFile();

      if (fileId) {
        await gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: "PATCH",
          params: { uploadType: "media" },
          body: content,
        });
      } else {
        const metadata = { name: DATA_FILE_NAME, parents: ["appDataFolder"] };
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        form.append("file", new Blob([content], { type: "application/json" }));
        await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        });
      }

      lastSyncTime = new Date();
    },

    getLastSyncTime: () => lastSyncTime,
  };
}
