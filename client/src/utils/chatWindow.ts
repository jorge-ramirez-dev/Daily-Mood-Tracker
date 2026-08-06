import type { TChatMessage } from "../lib/llm/types";

// Caps how much history is sent per request without touching what's on screen.
// Keeps the last `maxTurns` exchanges (a turn ≈ one user + one assistant message)
// and never starts the window on an assistant message, so providers that require
// the conversation to open on a user turn stay happy.
export const windowChatHistory = (messages: TChatMessage[], maxTurns: number): TChatMessage[] => {
  if (maxTurns <= 0) return messages.slice(-1);

  const windowed = messages.slice(-maxTurns * 2);
  if (windowed.length > 0 && windowed[0].role === "assistant") {
    return windowed.slice(1);
  }
  return windowed;
};
