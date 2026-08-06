import type { TLLMProviderName } from "../lib/llm/types";

export type TModelOption = { id: string; label: string };

export type TProviderCatalog = {
  name: TLLMProviderName;
  displayName: string;
  // Provider's privacy / data-retention policy, surfaced next to the consent gate.
  policyUrl: string;
  // Cheap model chosen so casual BYOK use stays inexpensive; power users opt up.
  defaultModel: string;
  models: TModelOption[];
};

export const LLM_CATALOG: Record<TLLMProviderName, TProviderCatalog> = {
  anthropic: {
    name: "anthropic",
    displayName: "Claude (Anthropic)",
    policyUrl: "https://www.anthropic.com/legal/privacy",
    defaultModel: "claude-haiku-4-5",
    models: [
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (cheapest)" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
    ],
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    policyUrl: "https://openai.com/policies/privacy-policy",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini (cheapest)" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini (Google)",
    policyUrl: "https://ai.google.dev/gemini-api/terms",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (cheapest)" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
};

export const DEFAULT_MAX_HISTORY_TURNS = 8;
