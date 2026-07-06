import { useEffect } from "react";
import { useCloudSync } from "../hooks/useCloudSync";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { ConfirmModal } from "./ConfirmModal";
import type { TEntriesMap } from "../utils/types";
import type { TSyncStatus } from "../lib/storage/types";
import { preloadGoogleScripts } from "../lib/storage/googleDrive";
import { applyNoteConflictResolution, mergeEntries } from "../utils/appHelpers";

type TProps = {
  entries: TEntriesMap;
  setEntries: (entries: TEntriesMap) => void;
};

export function CloudSyncSettings({ entries, setEntries }: TProps) {
  const { provider, status, lastSyncTime, error, connect, disconnect, backup, restore, isConnected } =
    useCloudSync(entries);
  const { modal, showConfirm, handleConfirm, handleCancel } = useConfirmModal();

  useEffect(() => {
    preloadGoogleScripts();
  }, []);

  const handleRestore = async () => {
    const remoteEntries = await restore();
    if (!remoteEntries) return;

    const confirmRestore = await showConfirm(
      "Restore from Drive",
      `Merge ${Object.keys(remoteEntries).length} entries from Google Drive with your current data?`,
      "Continue",
      "Cancel"
    );
    if (!confirmRestore) return;

    let { mergedEntries, noteConflicts } = mergeEntries(entries, remoteEntries);

    for (const conflict of noteConflicts) {
      const shouldOverwrite = await showConfirm(
        "Note Conflict",
        `Conflict on ${conflict.dateKey}:\n\nCurrent note:\n"${conflict.currentNote}"\n\nIncoming note:\n"${conflict.incomingNote}"`,
        "Use Incoming",
        "Keep Current"
      );
      if (shouldOverwrite) {
        mergedEntries = applyNoteConflictResolution(mergedEntries, conflict.dateKey, conflict.incomingNote);
      }
    }

    setEntries(mergedEntries);
  };

  return (
    <div className="cloud-sync">
      <h3 className="cloud-sync__title">Cloud Sync</h3>

      {!isConnected ? (
        <div className="cloud-sync__connect">
          <p className="cloud-sync__description">
            Sync your mood data across devices using your own cloud storage. Your data never
            touches our servers.
          </p>
          <div className="cloud-sync__providers">
            <button
              type="button"
              className="cloud-sync__provider-btn"
              onClick={() => connect("googleDrive")}
            >
              <GoogleDriveIcon />
              Connect Google Drive
            </button>
            {/* TODO: re-enable once Dropbox OAuth callback is implemented
            <button
              type="button"
              className="cloud-sync__provider-btn"
              onClick={() => connect("dropbox")}
            >
              <DropboxIcon />
              Connect Dropbox
            </button>
            */}
          </div>
        </div>
      ) : (
        <div className="cloud-sync__connected">
          <div className="cloud-sync__status-row">
            <span className="cloud-sync__provider-name">{provider?.displayName}</span>
            <StatusBadge status={status} />
          </div>

          {lastSyncTime && (
            <p className="cloud-sync__last-sync">
              Last synced: {lastSyncTime.toLocaleString()}
            </p>
          )}

          {error && <p className="cloud-sync__error">{error}</p>}

          <div className="cloud-sync__actions">
            <button
              type="button"
              className="cloud-sync__backup-btn"
              onClick={backup}
              disabled={status === "syncing"}
            >
              {status === "syncing" ? "Backing up…" : "Backup to Drive"}
            </button>
            <button
              type="button"
              className="cloud-sync__restore-btn"
              onClick={handleRestore}
              disabled={status === "syncing"}
            >
              {status === "syncing" ? "Restoring…" : "Restore from Drive"}
            </button>
          </div>
          <button type="button" className="cloud-sync__disconnect-btn" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: TSyncStatus }) {
  const labels: Record<TSyncStatus, string> = {
    idle: "Idle",
    syncing: "Syncing…",
    synced: "Synced",
    error: "Error",
  };
  return <span className={`cloud-sync__badge cloud-sync__badge--${status}`}>{labels[status]}</span>;
}

function GoogleDriveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 87.3 78" aria-hidden="true">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.92 15.92 0 001.95 7.85z" fill="#0066da"/>
      <path d="M43.65 25L29.9 1.2a15.8 15.8 0 00-3.3 3.3L1.95 48.55A15.92 15.92 0 000 56.4h27.5z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25A15.92 15.92 0 0087.3 50H59.8l5.85 11.25z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 1.2C56.05.43 54.5 0 52.9 0H34.4c-1.6 0-3.15.43-4.5 1.2z" fill="#00832d"/>
      <path d="M59.8 50H87.3a15.92 15.92 0 00-1.95-7.85l-3.85-6.65L67.75 12.2a16.27 16.27 0 00-3.3-3.3L50.7 32.15z" fill="#2684fc"/>
      <path d="M27.45 50l-13.75 23.8c1.35.77 2.9 1.2 4.5 1.2h51c1.6 0 3.15-.43 4.5-1.2L59.8 50z" fill="#ffba00"/>
    </svg>
  );
}

function DropboxIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 43 40" aria-hidden="true">
      <path d="M12.5 0L0 8l12.5 8L25 8zm18 0L18 8l12.5 8L43 8zM0 24l12.5 8L25 24l-12.5-8zm43 0L30.5 16 18 24l12.5 8zM12.5 34L25 26l12.5 8L25 42z" fill="#0061FF"/>
    </svg>
  );
}
