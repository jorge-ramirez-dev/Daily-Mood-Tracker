export type TLLMProviderName = "anthropic" | "openai" | "gemini";

export type TChatMessage = { role: "user" | "assistant"; content: string };

export type TLLMConfig = {
  provider: TLLMProviderName;
  model: string;
  apiKey: string;
  includeNotes: boolean;
  consented: boolean;
  // Bounds how many prior turns are sent per request (caps token growth in long chats).
  maxHistoryTurns: number;
  // Optional soft warn threshold; null = off. Warns, never blocks.
  warnAfterMessages: number | null;
};

// Populated from the provider's usage payload when the stream reports it.
export type TUsage = { inputTokens: number; outputTokens: number } | null;

export type TStreamHandlers = {
  onDelta: (text: string) => void;
  onUsage: (usage: TUsage) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

export type TLLMProvider = {
  readonly name: TLLMProviderName;
  readonly displayName: string;
  sendChat: (args: {
    apiKey: string;
    model: string;
    system: string;
    messages: TChatMessage[];
    signal: AbortSignal;
    handlers: TStreamHandlers;
  }) => Promise<void>;
};
