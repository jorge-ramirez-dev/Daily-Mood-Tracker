import { useCallback, useEffect, useRef, useState } from "react";
import type { TChatMessage, TLLMConfig, TUsage } from "../lib/llm/types";
import type { TEntriesMap } from "../utils/types";
import { getProvider, loadLLMConfig, saveLLMConfig } from "../lib/llm";
import { buildMoodContext } from "../utils/moodContext";
import { windowChatHistory } from "../utils/chatWindow";

export type TAskStatus = "idle" | "streaming" | "error";
export type TSessionUsage = { inputTokens: number; outputTokens: number };

// Error-handling ceilings only (not a UX cap): abort a single turn that streams
// unboundedly or hangs, so a provider bug or retry loop can't spend forever.
const RUNAWAY_CHAR_LIMIT = 100_000;
const RUNAWAY_TIMEOUT_MS = 120_000;

const getStorage = (): Storage | null => (typeof window === "undefined" ? null : window.localStorage);

export const useAskAI = (entries: TEntriesMap) => {
  const [config, setConfig] = useState<TLLMConfig>(() => loadLLMConfig(getStorage()));
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [status, setStatus] = useState<TAskStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [sessionUsage, setSessionUsage] = useState<TSessionUsage>({ inputTokens: 0, outputTokens: 0 });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveLLMConfig(getStorage(), config);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<TLLMConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((prev) => (prev === "streaming" ? "idle" : prev));
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setSessionUsage({ inputTokens: 0, outputTokens: 0 });
    setWarning(null);
    setError(null);
  }, [stop]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || status === "streaming") return;
      if (!config.consented || !config.apiKey) {
        setError("Add your API key and accept the consent notice before asking.");
        setStatus("error");
        return;
      }

      setError(null);
      setWarning(null);

      const userMessage: TChatMessage = { role: "user", content: trimmed };
      const history = [...messages, userMessage];
      setMessages([...history, { role: "assistant", content: "" }]);
      setStatus("streaming");

      if (config.warnAfterMessages != null && history.length > config.warnAfterMessages) {
        setWarning(`You've sent ${history.length} messages this session — mind your provider costs.`);
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const runawayTimer = setTimeout(() => controller.abort(), RUNAWAY_TIMEOUT_MS);

      const system = buildMoodContext(entries, { includeNotes: config.includeNotes });
      const windowed = windowChatHistory(history, config.maxHistoryTurns);

      let assistantText = "";
      let turnUsage: TUsage = null;

      const appendAssistant = (text: string) => {
        assistantText += text;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: assistantText };
          return next;
        });
      };

      await getProvider(config.provider).sendChat({
        apiKey: config.apiKey,
        model: config.model,
        system,
        messages: windowed,
        signal: controller.signal,
        handlers: {
          onDelta: (text) => {
            appendAssistant(text);
            if (assistantText.length > RUNAWAY_CHAR_LIMIT) {
              controller.abort();
              setError("Response stopped: it grew unexpectedly large.");
              setStatus("error");
            }
          },
          onUsage: (usage) => {
            turnUsage = usage;
          },
          onDone: () => {
            const finalUsage = turnUsage;
            if (finalUsage) {
              setSessionUsage((prev) => ({
                inputTokens: prev.inputTokens + finalUsage.inputTokens,
                outputTokens: prev.outputTokens + finalUsage.outputTokens,
              }));
            }
            setStatus("idle");
          },
          onError: (message) => {
            setError(message);
            setStatus("error");
          },
        },
      });

      clearTimeout(runawayTimer);
      abortRef.current = null;
    },
    [config, entries, messages, status]
  );

  const isReady = config.consented && config.apiKey.length > 0;

  return { config, updateConfig, messages, status, error, warning, sessionUsage, send, stop, clear, isReady };
};
