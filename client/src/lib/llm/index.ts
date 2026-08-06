import type { TLLMConfig, TLLMProvider, TLLMProviderName } from "./types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { geminiProvider } from "./gemini";
import { DEFAULT_MAX_HISTORY_TURNS, LLM_CATALOG } from "../../constants/llmModels";

const PROVIDERS: Record<TLLMProviderName, TLLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

export const getProvider = (name: TLLMProviderName): TLLMProvider => PROVIDERS[name];

// The key and config live only in the browser, alongside the entries store.
const CONFIG_STORAGE_KEY = "mood-tracker.llm.config";

type TStorageReader = Pick<Storage, "getItem"> | null;
type TStorageWriter = Pick<Storage, "setItem"> | null;

export const defaultLLMConfig = (): TLLMConfig => ({
  provider: "anthropic",
  model: LLM_CATALOG.anthropic.defaultModel,
  apiKey: "",
  includeNotes: false,
  consented: false,
  maxHistoryTurns: DEFAULT_MAX_HISTORY_TURNS,
  warnAfterMessages: null,
});

export const loadLLMConfig = (storage: TStorageReader): TLLMConfig => {
  if (!storage) return defaultLLMConfig();
  try {
    const stored = storage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) return defaultLLMConfig();
    const parsed = JSON.parse(stored) as Partial<TLLMConfig>;
    // Merge over defaults so an older/partial stored shape can't drop new fields.
    return { ...defaultLLMConfig(), ...parsed };
  } catch {
    return defaultLLMConfig();
  }
};

export const saveLLMConfig = (storage: TStorageWriter, config: TLLMConfig): void => {
  if (!storage) return;
  storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};
