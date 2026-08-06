import test from "node:test";
import assert from "node:assert/strict";
import { windowChatHistory } from "../chatWindow";
import type { TChatMessage } from "../../lib/llm/types";

const conversation = (count: number): TChatMessage[] =>
  Array.from({ length: count }, (_unused, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `m${index}`,
  }));

test("windowChatHistory returns everything when under the limit", () => {
  const messages = conversation(4);
  assert.deepEqual(windowChatHistory(messages, 8), messages);
});

test("windowChatHistory keeps only the last maxTurns exchanges", () => {
  const messages = conversation(10); // 5 turns
  const windowed = windowChatHistory(messages, 2); // last 2 turns = 4 messages
  assert.deepEqual(
    windowed.map((message) => message.content),
    ["m6", "m7", "m8", "m9"]
  );
});

test("windowChatHistory never starts the window on an assistant message", () => {
  const messages = conversation(9); // ends on a user message (m8)
  const windowed = windowChatHistory(messages, 2); // raw slice would start at m5 (assistant)
  assert.equal(windowed[0].role, "user");
});

test("windowChatHistory falls back to the latest message when turns are zero", () => {
  const messages = conversation(6);
  assert.deepEqual(windowChatHistory(messages, 0), [{ role: "assistant", content: "m5" }]);
});
