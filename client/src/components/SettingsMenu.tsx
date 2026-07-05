import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { List, FloppyDisk, ClockClockwise, Fire, Cloud } from "@phosphor-icons/react";

type TSettingsMenuProps = {
  onBackup: () => void;
  onRestore: () => void;
  onClear: () => void;
  onToggleSync: () => void;
  entryCount: number;
};

export const SettingsMenu = ({ onBackup, onRestore, onClear, onToggleSync, entryCount }: TSettingsMenuProps) => {
  const handleClear = () => {
    const confirmed = window.confirm(
      `Are you sure? This will delete ${entryCount} ${entryCount === 1 ? "entry" : "entries"}.`
    );
    if (confirmed) {
      onClear();
    }
  };

  return (
    <Menu as="div" className="settings-menu">
      <MenuButton className="settings-menu__trigger">
        <List weight="bold" aria-hidden="true" />
        <span className="sr-only">Settings menu</span>
      </MenuButton>

      <MenuItems className="settings-menu__items">
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`settings-menu__item ${focus ? "settings-menu__item--active" : ""}`}
              onClick={onToggleSync}
            >
              <Cloud weight="bold" />
              <span>Cloud Sync</span>
            </button>
          )}
        </MenuItem>

        <div className="settings-menu__separator" />

        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`settings-menu__item ${focus ? "settings-menu__item--active" : ""}`}
              onClick={onBackup}
            >
              <FloppyDisk weight="bold" />
              <span>Backup</span>
            </button>
          )}
        </MenuItem>

        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`settings-menu__item ${focus ? "settings-menu__item--active" : ""}`}
              onClick={onRestore}
            >
              <ClockClockwise weight="bold" />
              <span>Restore</span>
            </button>
          )}
        </MenuItem>

        <div className="settings-menu__separator" />

        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`settings-menu__item settings-menu__item--danger ${focus ? "settings-menu__item--active" : ""}`}
              onClick={handleClear}
            >
              <Fire weight="bold" />
              <span>Clear</span>
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
