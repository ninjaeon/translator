import { create } from "zustand";
import { LangText, TranslationRequest } from "../repos/translation/models";
import Language, { languageNull } from "../models/language";
import TranslationAgent from "../repos/translation/agent";
import useSettingsStore from "./settings";

export interface ParagraphStore {
  request: TranslationRequest;
  model: string;
  useRefinement: boolean;
  translatedText: string;
  isTranslating: boolean;
  confidenceScore: number | null;

  setModel: (model: string | null) => void;
  setSourceLang: (lang: Language | null) => void;
  setTargetLang: (lang: Language | null) => void;
  setUseRefinement: (use: boolean) => void;
  setContext: (context: string) => void;
  removeExampleAt: (index: number) => void;
  addExample: () => void;
  modifyExampleAt: (index: number, new1?: string, new2?: string) => void;
  setOriginalText: (text: string) => void;
}

const useParagraphStore = create<ParagraphStore>()((set, get) => ({
  request: {
    text: "",
    sourceLang: languageNull,
    targetLang: languageNull,
    examples: [],
  },
  // Initial values will be set from useSettingsStore after it loads
  model: useSettingsStore.getState().selectedModel ?? "",
  useRefinement: useSettingsStore.getState().useRefinement ?? false,
  // Note: sourceLang and targetLang are Language objects.
  // We'll need a bit more logic to initialize them from codes.
  // For now, request will start with languageNull and components will populate.
  request: {
    text: "",
    sourceLang: languageNull, // Initialize with null, components will set from settings
    targetLang: languageNull, // Initialize with null, components will set from settings
    examples: [],
  },
  translatedText: "",
  isTranslating: false,
  confidenceScore: null,

  setModel: (model) => {
    const newModel = model ?? "";
    set({ model: newModel });
    useSettingsStore.getState().persistSelectedModel(newModel);
  },
  setSourceLang: (lang) => {
    const newLang = lang ?? languageNull;
    set({ request: { ...get().request, sourceLang: newLang } });
    useSettingsStore.getState().persistSourceLanguageCode(newLang.code);
  },
  setTargetLang: (lang) => {
    const newLang = lang ?? languageNull;
    set({ request: { ...get().request, targetLang: newLang } });
    useSettingsStore.getState().persistTargetLanguageCode(newLang.code);
  },
  setUseRefinement: (useRefinement) => {
    set({ useRefinement: useRefinement });
    useSettingsStore.getState().persistUseRefinement(useRefinement);
  },
  setContext: (context) =>
    set({ request: { ...get().request, context: context } }),
  removeExampleAt: (index) =>
    set((state) => {
      const examples = [...state.request.examples];
      examples.splice(index, 1);
      return { request: { ...state.request, examples: examples } };
    }),
  addExample: () =>
    set((state) => {
      const examples = [...state.request.examples];
      examples.push(["", ""]);
      return { request: { ...state.request, examples: examples } };
    }),
  modifyExampleAt: (index, new1?, new2?) =>
    set((state) => {
      const examples = JSON.parse(JSON.stringify(state.request.examples));
      if (new1 != undefined) examples[index][0] = new1;
      if (new2 != undefined) examples[index][1] = new2;
      return { request: { ...state.request, examples: examples } };
    }),
  setOriginalText: (text) => set({ request: { ...get().request, text: text } }),
}));

export default useParagraphStore;
