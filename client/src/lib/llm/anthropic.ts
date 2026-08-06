import type { TLLMProvider, TStreamHandlers } from "./types";
import { describeHttpError, readSSE } from "./sse";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOKENS = 2048;

type TAnthropicEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
  message?: { usage?: { input_tokens?: number; output_tokens?: number } };
  usage?: { output_tokens?: number };
};

const handleEvent = (
  data: string,
  handlers: TStreamHandlers,
  usage: { inputTokens: number; outputTokens: number }
): void => {
  let event: TAnthropicEvent;
  try {
    event = JSON.parse(data) as TAnthropicEvent;
  } catch {
    return;
  }

  if (event.type === "content_block_delta" && event.delta?.text) {
    handlers.onDelta(event.delta.text);
    return;
  }

  if (event.type === "message_start" && event.message?.usage?.input_tokens != null) {
    usage.inputTokens = event.message.usage.input_tokens;
    handlers.onUsage({ ...usage });
    return;
  }

  if (event.type === "message_delta" && event.usage?.output_tokens != null) {
    usage.outputTokens = event.usage.output_tokens;
    handlers.onUsage({ ...usage });
  }
};

export const anthropicProvider: TLLMProvider = {
  name: "anthropic",
  displayName: "Claude (Anthropic)",
  sendChat: async ({ apiKey, model, system, messages, signal, handlers }) => {
    const usage = { inputTokens: 0, outputTokens: 0 };
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": API_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system, messages, stream: true }),
      });

      if (!response.ok) {
        handlers.onError(await describeHttpError(response));
        return;
      }

      await readSSE(response, (data) => handleEvent(data, handlers, usage), signal);
      handlers.onDone();
    } catch (error) {
      if (signal.aborted) return;
      handlers.onError(error instanceof Error ? error.message : "Unknown error");
    }
  },
};
