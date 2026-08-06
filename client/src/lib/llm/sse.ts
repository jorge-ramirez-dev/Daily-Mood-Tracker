// Shared Server-Sent-Events helpers for the streaming provider adapters.
// Kept provider-agnostic: callers parse the per-event `data` payloads themselves.

export type TSSEParseResult = { events: string[]; rest: string };

const extractData = (block: string): string | null => {
  const dataLines = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).replace(/^ /, ""));
  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
};

// Splits an accumulated buffer into complete SSE event blocks (separated by a
// blank line), returning each block's joined `data` payload plus the unconsumed
// remainder to carry into the next chunk. Pure — unit-tested in isolation.
export const parseSSEBuffer = (buffer: string): TSSEParseResult => {
  const events: string[] = [];
  let working = buffer.replace(/\r\n/g, "\n");

  let separatorIndex = working.indexOf("\n\n");
  while (separatorIndex !== -1) {
    const block = working.slice(0, separatorIndex);
    working = working.slice(separatorIndex + 2);
    const data = extractData(block);
    if (data !== null) events.push(data);
    separatorIndex = working.indexOf("\n\n");
  }

  return { events, rest: working };
};

// Reads a streamed Response body, delivering each SSE `data` payload to onEvent.
// Honors the abort signal cooperatively and flushes any trailing event.
export const readSSE = async (
  response: Response,
  onEvent: (data: string) => void,
  signal: AbortSignal
): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response has no readable body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal.aborted) {
      await reader.cancel();
      return;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSSEBuffer(buffer);
    buffer = rest;
    for (const data of events) onEvent(data);
  }

  const { events } = parseSSEBuffer(`${buffer}\n\n`);
  for (const data of events) onEvent(data);
};

// Turns a non-2xx response into a readable error message, preferring the
// provider's JSON `error.message` and falling back to raw text / status.
export const describeHttpError = async (response: Response): Promise<string> => {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string };
    if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
      return parsed.error.message;
    }
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  if (text) return text;
  return `Request failed with status ${response.status}`;
};
