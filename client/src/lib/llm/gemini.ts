import type { TChatMessage, TLLMProvider, TStreamHandlers } from "./types";
import { describeHttpError, readSSE } from "./sse";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type TGeminiEvent = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

// Gemini uses "model" (not "assistant") for the AI role in its contents array.
const toGeminiRole = (role: TChatMessage["role"]): "user" | "model" =>
  role === "assistant" ? "model" : "user";

const handleEvent = (data: string, handlers: TStreamHandlers): void => {
  let event: TGeminiEvent;
  try {
    event = JSON.parse(data) as TGeminiEvent;
  } catch {
    return;
  }

  const parts = event.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.text) handlers.onDelta(part.text);
  }

  if (event.usageMetadata?.promptTokenCount != null) {
    handlers.onUsage({
      inputTokens: event.usageMetadata.promptTokenCount,
      outputTokens: event.usageMetadata.candidatesTokenCount ?? 0,
    });
  }
};

export const geminiProvider: TLLMProvider = {
  name: "gemini",
  displayName: "Gemini (Google)",
  sendChat: async ({ apiKey, model, system, messages, signal, handlers }) => {
    const endpoint = `${BASE_URL}/${model}:streamGenerateContent?alt=sse`;
    const contents = messages.map((message: TChatMessage) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.content }],
    }));

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
        }),
      });

      if (!response.ok) {
        handlers.onError(await describeHttpError(response));
        return;
      }

      await readSSE(response, (data) => handleEvent(data, handlers), signal);
      handlers.onDone();
    } catch (error) {
      if (signal.aborted) return;
      handlers.onError(error instanceof Error ? error.message : "Unknown error");
    }
  },
};
