import type { TChatMessage, TLLMProvider, TStreamHandlers } from "./types";
import { describeHttpError, readSSE } from "./sse";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DONE_SENTINEL = "[DONE]";

type TOpenAIEvent = {
  choices?: { delta?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
};

const handleEvent = (data: string, handlers: TStreamHandlers): void => {
  if (data === DONE_SENTINEL) return;

  let event: TOpenAIEvent;
  try {
    event = JSON.parse(data) as TOpenAIEvent;
  } catch {
    return;
  }

  const delta = event.choices?.[0]?.delta?.content;
  if (delta) handlers.onDelta(delta);

  if (event.usage?.prompt_tokens != null && event.usage.completion_tokens != null) {
    handlers.onUsage({
      inputTokens: event.usage.prompt_tokens,
      outputTokens: event.usage.completion_tokens,
    });
  }
};

export const openaiProvider: TLLMProvider = {
  name: "openai",
  displayName: "OpenAI",
  sendChat: async ({ apiKey, model, system, messages, signal, handlers }) => {
    const payloadMessages: { role: string; content: string }[] = [
      { role: "system", content: system },
      ...messages.map((message: TChatMessage) => ({ role: message.role, content: message.content })),
    ];

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          stream: true,
          stream_options: { include_usage: true },
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
