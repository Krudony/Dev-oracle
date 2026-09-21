import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadableStream } from 'node:stream/web';

import { formatSseFrame, parseOpenAiSseStream } from '../../lib/sse-parser.mjs';

test('sse-parser - formatSseFrame builds standard SSE text', () => {
  const frame1 = formatSseFrame('chunk', { text: 'สวัสดี' });
  assert.equal(frame1, 'event: chunk\ndata: {"text":"สวัสดี"}\n\n');

  const frame2 = formatSseFrame('ping', 'pong');
  assert.equal(frame2, 'event: ping\ndata: pong\n\n');
});

test('sse-parser - parseOpenAiSseStream extracts streamed deltas', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"ข้อความส่วนที่ 1 "}}]}\n\n',
    'data: {"choices":[{"delta":{"reasoning_content":"[คิดวิเคราะห์]"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"ข้อความส่วนที่ 2"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  const receivedTokens = [];
  const activities = [];

  const full = await parseOpenAiSseStream(stream, {
    onText: (t) => receivedTokens.push(t),
    onActivity: (a) => activities.push(a),
  });

  assert.equal(full, 'ข้อความส่วนที่ 1 ข้อความส่วนที่ 2');
  assert.deepEqual(receivedTokens, ['ข้อความส่วนที่ 1 ', 'ข้อความส่วนที่ 2']);
  assert.deepEqual(activities, ['[คิดวิเคราะห์]']);
});

test('sse-parser - handles split chunks across packet boundaries', async () => {
  const partA = 'data: {"choices":[{"delta":{"content":"สวัสดี';
  const partB = 'ชาวโลก"}}]}\n\n';
  const partC = 'data: [DONE]\n\n';

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(partA));
      controller.enqueue(new TextEncoder().encode(partB));
      controller.enqueue(new TextEncoder().encode(partC));
      controller.close();
    },
  });

  const full = await parseOpenAiSseStream(stream);
  assert.equal(full, 'สวัสดีชาวโลก');
});

test('sse-parser - throws on stream error object payload', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"error":{"message":"โควตาเครดิตหมด"}}\n\n')
      );
      controller.close();
    },
  });

  let errorCallbackCalled = false;

  await assert.rejects(
    async () => {
      await parseOpenAiSseStream(stream, {
        onError: (err) => {
          errorCallbackCalled = true;
          assert.match(err.message, /โควตาเครดิตหมด/);
        },
      });
    },
    /โควตาเครดิตหมด/
  );

  assert.equal(errorCallbackCalled, true);
});

test('sse-parser - regression: throws on stream error string payload', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"error":"upstream timeout"}\n\n')
      );
      controller.close();
    },
  });

  await assert.rejects(
    async () => {
      await parseOpenAiSseStream(stream);
    },
    /upstream timeout/
  );
});

test('sse-parser - regression: ignores heartbeat and comment frames without throwing', async () => {
  const chunks = [
    ': ping heartbeat\n\n',
    'data: {"choices":[{"delta":{"content":"ข้อมูลปกติ"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });

  const text = await parseOpenAiSseStream(stream);
  assert.equal(text, 'ข้อมูลปกติ');
});

test('sse-parser - throws on premature EOF before [DONE] signal', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ข้อความที่ถูกตัดกลางคัน"}}]}\n\n')
      );
      controller.close(); // stream ends prematurely without data: [DONE]
    },
  });

  let errorFired = false;
  await assert.rejects(
    async () => {
      await parseOpenAiSseStream(stream, {
        onError: (err) => {
          errorFired = true;
          assert.match(err.message, /prematurely.*\[DONE\]/i);
        },
      });
    },
    /prematurely.*\[DONE\]/i
  );

  assert.equal(errorFired, true, 'onError callback must fire on premature EOF');
});

test('sse-parser - supports CRLF (\\r\\n\\r\\n and \\r\\n) framing cleanly', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"choices":[{"delta":{"content":"สวัสดี CRLF"}}]}\r\n\r\ndata: [DONE]\r\n\r\n')
      );
      controller.close();
    },
  });

  const chunks = [];
  const text = await parseOpenAiSseStream(stream, {
    onText: (c) => chunks.push(c),
  });

  assert.equal(text, 'สวัสดี CRLF');
  assert.deepEqual(chunks, ['สวัสดี CRLF']);
});
