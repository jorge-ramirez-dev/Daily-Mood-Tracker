import type { TStorageProvider } from "./types";
import type { TEntriesMap } from "../../utils/types";

// Trimmed: a stray space in the env var URL-encodes into the auth request and
// makes Google reject the client_id with invalid_client.
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string)?.trim();
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const DATA_FILE_NAME = "mood-tracker-data.json";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

const TOKEN_KEY = "mood-tracker.google.token";
const TOKEN_EXPIRY_KEY = "mood-tracker.google.expiry";
const OAUTH_STATE_KEY = "mood-tracker.google.oauth-state";

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

let scriptsLoaded = false;

export const preloadGoogleScripts = async (): Promise<void> => {
  if (scriptsLoaded) return;
  await loadGapiScript();
  scriptsLoaded = true;
};

/**
 * Detects a return from Google's OAuth redirect, validates the state nonce,
 * and persists the access token from the URL fragment. Cleans the fragment
 * from the address bar either way. Returns true when this page load is an
 * OAuth redirect (successful or not) so the caller can reopen the sync UI.
 */
export const captureGoogleOAuthRedirect = (): boolean => {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.slice(1);
  if (!hash.includes("access_token=") && !hash.includes("error=")) return false;

  const params = new URLSearchParams(hash);
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  const accessToken = params.get("access_token");
  const returnedState = params.get("state");
  if (!accessToken || !expectedState || returnedState !== expectedState) return true;

  const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + expiresIn * 1000).toString());
  return true;
};

export function createGoogleDriveProvider(): TStorageProvider {
  let accessToken: string | null = null;
  let lastSyncTime: Date | null = null;

  const storedToken = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (storedToken && expiry && Date.now() < parseInt(expiry)) {
    accessToken = storedToken;
  }

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

    connect: () => {
      const stateNonce = crypto.randomUUID();
      sessionStorage.setItem(OAUTH_STATE_KEY, stateNonce);

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: window.location.origin,
        response_type: "token",
        scope: SCOPES,
        state: stateNonce,
        prompt: "select_account",
      });
      window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);

      // The page navigates away; this promise intentionally never settles.
      return new Promise(() => {});
    },

    disconnect: () => {
      if (accessToken) {
        fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(accessToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }).catch(() => {
          // Best effort: clearing local state below is what disconnects the app.
        });
      }
      accessToken = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    },

    load: async () => {
      if (!accessToken) throw new Error("Not connected to Google Drive");
      await preloadGoogleScripts();
      gapi.client.setToken({ access_token: accessToken });
      const fileId = await findDataFile();
      if (!fileId) return {};
      const response = await gapi.client.drive.files.get({ fileId, alt: "media" });
      lastSyncTime = new Date();
      return JSON.parse(response.body) as TEntriesMap;
    },

    save: async (entries: TEntriesMap) => {
      if (!accessToken) throw new Error("Not connected to Google Drive");
      await preloadGoogleScripts();
      gapi.client.setToken({ access_token: accessToken });
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
