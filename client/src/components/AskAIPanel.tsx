import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAskAI } from "../hooks/useAskAI";
import { LLMSettings } from "./LLMSettings";
import { PROMPT_SUGGESTIONS } from "../constants/prompts";
import type { TEntriesMap } from "../utils/types";

type TProps = {
  entries: TEntriesMap;
  isOpen: boolean;
  onClose: () => void;
};

// Overlay bottom-sheet / docked panel rendered in a portal on top of the page.
// Stays mounted while closed (returns null) so the chat thread and session usage
// survive open/close; config persists via localStorage regardless.
export const AskAIPanel = ({ entries, isOpen, onClose }: TProps) => {
  const ai = useAskAI(entries);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [ai.messages]);

  // Land on Settings first when the panel opens unconfigured.
  useEffect(() => {
    if (isOpen && !ai.isReady) setShowSettings(true);
  }, [isOpen, ai.isReady]);

  if (!isOpen) return null;

  const handleSend = () => {
    const question = draft;
    setDraft("");
    ai.send(question);
  };

  const sessionTotal = ai.sessionUsage.inputTokens + ai.sessionUsage.outputTokens;

  return createPortal(
    <div className="ask-ai" role="dialog" aria-modal="true" aria-label="Ask AI">
      <button type="button" className="ask-ai__scrim" aria-label="Close" onClick={onClose} />

      <section className="ask-ai__panel">
        <header className="ask-ai__header">
          <span className="ask-ai__title">✦ Ask AI</span>
          <div className="ask-ai__header-actions">
            <button type="button" className="ask-ai__ghost" onClick={() => setShowSettings((prev) => !prev)}>
              {showSettings ? "Back to chat" : "Settings"}
            </button>
            <button type="button" className="ask-ai__ghost" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {showSettings ? (
          <div className="ask-ai__body">
            <LLMSettings config={ai.config} onUpdateConfig={ai.updateConfig} />
            {ai.isReady && (
              <button type="button" className="ask-ai__done" onClick={() => setShowSettings(false)}>
                Done
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="ask-ai__body" ref={listRef}>
              {ai.messages.length === 0 ? (
                <div className="ask-ai__suggestions">
                  <p className="ask-ai__hint">Ask about your mood data:</p>
                  {PROMPT_SUGGESTIONS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="ask-ai__chip"
                      disabled={!ai.isReady || ai.status === "streaming"}
                      onClick={() => ai.send(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                ai.messages.map((message, index) => (
                  <div key={index} className={`ask-ai__message ask-ai__message--${message.role}`}>
                    {message.content || (ai.status === "streaming" ? "…" : "")}
                  </div>
                ))
              )}
              {ai.warning && <p className="ask-ai__warning">{ai.warning}</p>}
              {ai.error && <p className="ask-ai__error">{ai.error}</p>}
            </div>

            <footer className="ask-ai__footer">
              <div className="ask-ai__meta">
                {sessionTotal > 0 && (
                  <span>
                    Session: {ai.sessionUsage.inputTokens} in / {ai.sessionUsage.outputTokens} out tokens
                  </span>
                )}
                {ai.messages.length > 0 && (
                  <button type="button" className="ask-ai__ghost" onClick={ai.clear}>
                    Clear chat
                  </button>
                )}
              </div>

              <div className="ask-ai__input-row">
                <textarea
                  className="ask-ai__input"
                  rows={1}
                  value={draft}
                  placeholder={ai.isReady ? "Ask a question…" : "Add your API key in Settings first"}
                  disabled={!ai.isReady}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) return;
                    event.preventDefault();
                    if (ai.status !== "streaming" && draft.trim()) handleSend();
                  }}
                />
                {ai.status === "streaming" ? (
                  <button type="button" className="ask-ai__send" onClick={ai.stop}>
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ask-ai__send"
                    disabled={!ai.isReady || !draft.trim()}
                    onClick={handleSend}
                  >
                    Send
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body
  );
};
