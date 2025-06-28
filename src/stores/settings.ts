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
  // Persisted UI selections - also mirrored here for central loading
  selectedModel: string | null;
  sourceLanguageCode: string | null;
  targetLanguageCode: string | null;
  useRefinement: boolean;

  updateHost: (text: string) => Promise<void>;
  closeInvalidAlert: () => void;
  toggleShowWindowOnStartup: () => void;
  toggleHideToSystemTray: () => void;
  // Setters for new persisted UI things, to notify main process
  persistSelectedModel: (model: string | null) => void;
  persistSourceLanguageCode: (code: string | null) => void;
  persistTargetLanguageCode: (code: string | null) => void;
  persistUseRefinement: (use: boolean) => void;
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
          // Merging all settings from main process store
          ...(initialSettings as Partial<SettingsStore>),
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
    // Defaults for UI selections
    selectedModel: null,
    sourceLanguageCode: null,
    targetLanguageCode: null,
    useRefinement: false,

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
    persistSelectedModel: (model) => {
      set({ selectedModel: model });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ selectedModel: model });
      }
    },
    persistSourceLanguageCode: (code) => {
      set({ sourceLanguageCode: code });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ sourceLanguageCode: code });
      }
    },
    persistTargetLanguageCode: (code) => {
      set({ targetLanguageCode: code });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ targetLanguageCode: code });
      }
    },
    persistUseRefinement: (use) => {
      set({ useRefinement: use });
      if (window.api && window.api.sendSettingsUpdated) {
        window.api.sendSettingsUpdated({ useRefinement: use });
      }
    },
  };
});

export default useSettingsStore;
