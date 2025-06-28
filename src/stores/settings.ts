import { create } from "zustand";
import Language from "../models/language";
import { getAppVersion, readLanguagesCsv } from "../repos/settings/settings";
import TranslationAgent, { DEFAULT_HOST } from "../repos/translation/agent";

export interface SettingsStore {
  version: string;
  languages: Language[];
  host: string;
  alertInvalidHost: boolean;
  models: string[];
  showWindowOnStartup: boolean;
  hideToSystemTray: boolean;

  updateHost: (text: string) => Promise<void>;
  closeInvalidAlert: () => void;
  toggleShowWindowOnStartup: () => void;
  toggleHideToSystemTray: () => void;
}

const useSettingsStore = create<SettingsStore>()((set, get) => {
  async function updateHost(host: string) {
    set({ host: host });
    const results = await TranslationAgent.tryListModels(host);
    set({ models: results.models, alertInvalidHost: !results.isSuccess });
  }

  // Load initial settings from main process
  if (window.api && window.api.getInitialSettings) {
    window.api
      .getInitialSettings()
      .then((initialSettings) => {
        set((state) => ({
          ...state,
          showWindowOnStartup:
            initialSettings.showWindowOnStartup ?? state.showWindowOnStartup,
          hideToSystemTray:
            initialSettings.hideToSystemTray ?? state.hideToSystemTray,
        }));
      })
      .catch((err) => console.error("Failed to get initial settings:", err));
  }

  getAppVersion().then((res) => set({ version: res }));
  readLanguagesCsv().then((res) => set({ languages: res }));
  setTimeout(() => updateHost(DEFAULT_HOST), 0); // so that set works after init
  return {
    version: "",
    languages: [],
    host: DEFAULT_HOST,
    alertInvalidHost: false,
    models: [],
    showWindowOnStartup: true,
    hideToSystemTray: true,

    updateHost: updateHost,
    closeInvalidAlert: () => set({ alertInvalidHost: false }),
    toggleShowWindowOnStartup: () => {
      const newValue = !get().showWindowOnStartup;
      set({ showWindowOnStartup: newValue });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ showWindowOnStartup: newValue });
      }
    },
    toggleHideToSystemTray: () => {
      const newValue = !get().hideToSystemTray;
      set({ hideToSystemTray: newValue });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ hideToSystemTray: newValue });
      }
    },
  };
});

export default useSettingsStore;
