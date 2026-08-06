import test from "node:test";
import assert from "node:assert/strict";
import { parseSSEBuffer } from "../../lib/llm/sse";

test("parseSSEBuffer extracts complete events and keeps the remainder", () => {
  const { events, rest } = parseSSEBuffer('data: {"a":1}\n\ndata: {"b":2}\n\ndata: partial');

  assert.deepEqual(events, ['{"a":1}', '{"b":2}']);
  assert.equal(rest, "data: partial");
});

test("parseSSEBuffer buffers an incomplete event until its blank line arrives", () => {
  const first = parseSSEBuffer("data: hel");
  assert.deepEqual(first.events, []);
  assert.equal(first.rest, "data: hel");

  const second = parseSSEBuffer(`${first.rest}lo\n\n`);
  assert.deepEqual(second.events, ["hello"]);
  assert.equal(second.rest, "");
});

test("parseSSEBuffer joins multi-line data payloads", () => {
  const { events } = parseSSEBuffer("data: line one\ndata: line two\n\n");
  assert.deepEqual(events, ["line one\nline two"]);
});

test("parseSSEBuffer ignores comment and event-name lines", () => {
  const { events } = parseSSEBuffer(": keep-alive\nevent: message\ndata: payload\n\n");
  assert.deepEqual(events, ["payload"]);
});

test("parseSSEBuffer normalizes CRLF line endings", () => {
  const { events, rest } = parseSSEBuffer('data: {"x":1}\r\n\r\n');
  assert.deepEqual(events, ['{"x":1}']);
  assert.equal(rest, "");
});
