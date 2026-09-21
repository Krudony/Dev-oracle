import test from 'node:test';
import assert from 'node:assert/strict';

import { startFakeBridge } from '../harness.mjs';
import {
  fetchBridgeStatus,
  fetchBridgeModels,
  fetchBridgeCredits,
  streamBridgeCompletion,
  createTemporaryConversation,
} from '../../lib/bridge-client.mjs';
import { runSerialPipeline, retryRole } from '../../lib/orchestrator.mjs';

test('bridge-client - fetchBridgeStatus reports live bridge readiness', async (t) => {
  const fakeBridge = await startFakeBridge();
  t.after(() => fakeBridge.stop());

  const status = await fetchBridgeStatus(fakeBridge.base);
  assert.equal(status.ok, true);
  assert.equal(status.ready, true);
  assert.equal(status.extensions, 1);
});

test('bridge-client - fetchBridgeStatus gracefully handles offline bridge', async () => {
  // Point to a non-existent port
  const status = await fetchBridgeStatus('http://127.0.0.1:59999');
  assert.equal(status.ok, false);
  assert.equal(status.ready, false);
  assert.equal(status.bridgeRunning, false);
});

test('bridge-client - rejects multiple connected extensions to prevent duplicated stream deltas', async (t) => {
  const fakeBridge = await startFakeBridge({
    status: () => ({ ok: true, extensions: 2 }),
  });
  t.after(() => fakeBridge.stop());

  const status = await fetchBridgeStatus(fakeBridge.base);
  assert.equal(status.ok, true, 'The bridge itself is reachable');
  assert.equal(status.ready, false, 'Two extensions must never be considered ready');
  assert.equal(status.extensions, 2);
  assert.equal(status.code, 'MULTIPLE_AIPASS_EXTENSIONS');
  assert.match(status.error, /เหลือ 1 ตัว/);
});

test('bridge-client - fetchBridgeModels retrieves model list from bridge', async (t) => {
  const fakeBridge = await startFakeBridge({
    models: () => ({
      data: [
        { id: 'custom-model', name: 'Custom AI', kind: 'chat', free_credit: true },
      ],
    }),
  });
  t.after(() => fakeBridge.stop());

  const models = await fetchBridgeModels(fakeBridge.base);
  assert.ok(Array.isArray(models));
  assert.equal(models[0].id, 'custom-model');
  assert.equal(models[0].free_credit, true);
});

test('bridge-client - live model failure returns no models instead of demo fallback', async () => {
  const models = await fetchBridgeModels('http://127.0.0.1:59999');
  assert.deepEqual(models, []);
});

test('bridge-client - buildUserMessageContent handles text, pdf files, and images', async () => {
  const { buildUserMessageContent } = await import('../../lib/bridge-client.mjs');

  // Text-only
  const textMsg = buildUserMessageContent('คำถามข้อความ', null);
  assert.equal(textMsg, 'คำถามข้อความ');

  // PDF attachment
  const pdfAttachment = {
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,JVBERi0xLjQKJXRlc3QK',
  };
  const pdfMsg = buildUserMessageContent('คำถามพร้อม PDF', pdfAttachment);
  assert.ok(Array.isArray(pdfMsg));
  assert.equal(pdfMsg[0].type, 'text');
  assert.equal(pdfMsg[0].text, 'คำถามพร้อม PDF');
  assert.equal(pdfMsg[1].type, 'file');
  assert.equal(pdfMsg[1].file.filename, 'document.pdf');
  assert.equal(pdfMsg[1].file.file_data, 'data:application/pdf;base64,JVBERi0xLjQKJXRlc3QK');

  // Image attachment
  const imgAttachment = {
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    dataUri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  };
  const imgMsg = buildUserMessageContent('คำถามพร้อมรูป', imgAttachment);
  assert.ok(Array.isArray(imgMsg));
  assert.equal(imgMsg[1].type, 'image_url');
  assert.equal(imgMsg[1].image_url.url, 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
});

test('bridge-client - fetchBridgeCredits retrieves live credits and does not fake credits when offline', async (t) => {
  const fakeBridge = await startFakeBridge({
    credits: () => ({ remaining: 750, total: 1000 }),
  });
  t.after(() => fakeBridge.stop());

  const liveCredits = await fetchBridgeCredits(fakeBridge.base);
  assert.equal(liveCredits.remaining, 750);

  // Offline live mode must not surface demo credit data.
  const offlineCredits = await fetchBridgeCredits('http://127.0.0.1:59998');
  assert.equal(offlineCredits, null);
});

test('bridge-client - streamBridgeCompletion streams tokens via SSE', async (t) => {
  const fakeBridge = await startFakeBridge({
    onChat: (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      res.write('data: {"choices":[{"delta":{"content":"สวัสดีครับ "}}]}\n\n');
      res.write('data: {"choices":[{"delta":{"content":"นี่คือข้อความทดสอบ"}}]}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    },
  });
  t.after(() => fakeBridge.stop());

  const chunks = [];
  const fullText = await streamBridgeCompletion({
    prompt: 'ทดสอบการสตรีม',
    baseUrl: fakeBridge.base,
    onChunk: (c) => chunks.push(c),
  });

  assert.equal(fullText, 'สวัสดีครับ นี่คือข้อความทดสอบ');
  assert.deepEqual(chunks, ['สวัสดีครับ ', 'นี่คือข้อความทดสอบ']);
});

test('bridge-client - stream timeout is idle-based and resets on Claude-style slow deltas', async (t) => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fakeBridge = await startFakeBridge({
    onChat: async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const content of ['อ่าน', 'เอกสาร', 'ด้วย', 'Claude', 'สำเร็จ']) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
        await wait(40);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    },
  });
  t.after(() => fakeBridge.stop());

  const started = Date.now();
  const text = await streamBridgeCompletion({
    prompt: 'ทดสอบ slow stream',
    model: 'claude-opus-5@azure',
    baseUrl: fakeBridge.base,
    timeoutMs: 100,
  });

  assert.equal(text, 'อ่านเอกสารด้วยClaudeสำเร็จ');
  assert.ok(Date.now() - started > 100, 'Total duration must exceed one idle timeout window');
});

test('bridge-client - streamBridgeCompletion rejects with descriptive error on HTTP error', async (t) => {
  const fakeBridge = await startFakeBridge({
    onChat: (req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Upstream Internal Server Error');
    },
  });
  t.after(() => fakeBridge.stop());

  await assert.rejects(
    async () => {
      await streamBridgeCompletion({
        prompt: 'ทดสอบ Error',
        baseUrl: fakeBridge.base,
      });
    },
    /AiPASS Bridge returned HTTP 500/
  );
});

test('bridge-client - createTemporaryConversation sends POST /conversations/new with temporary flag', async (t) => {
  let capturedBody = null;
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res, body) => {
      capturedBody = body;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-session-999', temporary: true }));
    },
  });
  t.after(() => fakeBridge.stop());

  const result = await createTemporaryConversation(fakeBridge.base, 'gemini-3.1-flash-lite');
  assert.ok(result);
  assert.equal(result.ok, true);
  assert.equal(result.id, 'temp-session-999');
  assert.equal(capturedBody?.temporary, true);
  assert.equal(capturedBody?.model, 'gemini-3.1-flash-lite');
});

test('bridge-client - runSerialPipeline invokes /conversations/new BEFORE serial chat completions', async (t) => {
  const callSequence = [];
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res, body) => {
      callSequence.push({ endpoint: '/conversations/new', body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-pipeline-001', temporary: true }));
    },
    onChat: (req, res) => {
      callSequence.push({ endpoint: '/v1/chat/completions' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      res.write('data: {"choices":[{"delta":{"content":"ข้อความสำเร็จ"}}]}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    },
  });
  t.after(() => fakeBridge.stop());

  const events = [];
  const result = await runSerialPipeline({
    goal: 'ทดสอบการสร้างเซสชันชั่วคราวก่อนเริ่ม serial pipeline',
    baseUrl: fakeBridge.base,
    isDemo: false,
    model: 'gemini-3.1-flash-lite',
    onEvent: (event, data) => events.push({ event, data }),
  });

  assert.ok(result);
  // Verify that the very first request was /conversations/new
  assert.ok(callSequence.length >= 2, 'Must have recorded conversation creation and chat requests');
  assert.equal(callSequence[0].endpoint, '/conversations/new', 'First HTTP call must be /conversations/new');
  assert.equal(callSequence[0].body?.temporary, true, 'Temporary flag must be true');

  // Verify all subsequent requests are chat completions
  for (let i = 1; i < callSequence.length; i++) {
    assert.equal(callSequence[i].endpoint, '/v1/chat/completions');
  }

  // Verify conversation_init event was emitted
  const initEvent = events.find((e) => e.event === 'conversation_init');
  assert.ok(initEvent, 'Must emit conversation_init event');
  assert.equal(initEvent.data.temporary, true);
});

test('bridge-client - createTemporaryConversation rejects when bridge fails (fail-closed)', async (t) => {
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bridge failed to allocate temporary session' }));
    },
  });
  t.after(() => fakeBridge.stop());

  await assert.rejects(
    async () => {
      await createTemporaryConversation(fakeBridge.base, 'gemini-3.1-flash-lite');
    },
    /Failed to create temporary conversation/
  );
});

test('bridge-client - runSerialPipeline halts immediately and does NOT emit temporary:true if temp session fails', async (t) => {
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Temporary session service unavailable' }));
    },
  });
  t.after(() => fakeBridge.stop());

  const events = [];
  await assert.rejects(
    async () => {
      await runSerialPipeline({
        goal: 'ทดสอบ fail-closed privacy',
        baseUrl: fakeBridge.base,
        isDemo: false,
        model: 'gemini-3.1-flash-lite',
        onEvent: (event, data) => events.push({ event, data }),
      });
    },
    /Failed to create temporary conversation/
  );

  // Must NOT emit conversation_init with temporary: true
  const initEvent = events.find((e) => e.event === 'conversation_init');
  assert.equal(initEvent, undefined, 'Must NEVER emit conversation_init if temporary session failed');

  // Must NOT run any subsequent role completions
  const roleStarts = events.filter((e) => e.event === 'role_start');
  assert.equal(roleStarts.length, 0, 'Must NOT start any roles on permanent active conversation');
});

test('bridge-client - retryRole in live mode calls createTemporaryConversation before chat', async (t) => {
  const callSequence = [];
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res, body) => {
      callSequence.push({ endpoint: '/conversations/new', body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-retry-session', temporary: true }));
    },
    onChat: (req, res) => {
      callSequence.push({ endpoint: '/v1/chat/completions' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      res.write('data: {"choices":[{"delta":{"content":"ผลการ retry สำเร็จ"}}]}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    },
  });
  t.after(() => fakeBridge.stop());

  const events = [];
  const result = await retryRole({
    roleId: 'action_planner',
    goal: 'ทดสอบ retry live temporary session',
    stepsSoFar: { interpreter: 'สรุป 1', risk_checker: 'ความเสี่ยง 1' },
    isDemo: false,
    baseUrl: fakeBridge.base,
    model: 'gemini-3.1-flash-lite',
    onEvent: (event, data) => events.push({ event, data }),
  });

  assert.ok(result);
  assert.ok(callSequence.length >= 2, 'Must have called /conversations/new followed by completions');
  assert.equal(callSequence[0].endpoint, '/conversations/new', 'First call must be /conversations/new');
  assert.equal(callSequence[0].body?.temporary, true);

  const initEvent = events.find((e) => e.event === 'conversation_init');
  assert.ok(initEvent, 'Must emit conversation_init on retry');
  assert.equal(initEvent.data.temporary, true);
  assert.equal(initEvent.data.isRetry, true);
});

test('bridge-client - retryRole in live mode halts immediately if temporary conversation creation fails (fail-closed)', async (t) => {
  const fakeBridge = await startFakeBridge({
    onConversationNew: (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bridge could not allocate temporary conversation for retry' }));
    },
  });
  t.after(() => fakeBridge.stop());

  const events = [];
  await assert.rejects(
    async () => {
      await retryRole({
        roleId: 'risk_checker',
        goal: 'ทดสอบ fail-closed on retry',
        stepsSoFar: { interpreter: 'ข้อมูลเดิม' },
        isDemo: false,
        baseUrl: fakeBridge.base,
        model: 'gemini-3.1-flash-lite',
        onEvent: (event, data) => events.push({ event, data }),
      });
    },
    /Failed to create temporary conversation/
  );

  const initEvent = events.find((e) => e.event === 'conversation_init');
  assert.equal(initEvent, undefined, 'Must not emit conversation_init when temp session fails');

  const roleStarts = events.filter((e) => e.event === 'role_start');
  assert.equal(roleStarts.length, 0, 'Must not start retrying any roles on failure');
});
