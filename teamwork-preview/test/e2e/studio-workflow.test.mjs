/**
 * Official End-to-End (E2E) Test Suite — AiPASS Teamwork Studio ("รู้ทันหนังสือราชการ")
 *
 * This suite executes complete end-to-end integration workflows over HTTP:
 * - Server startup, CORS, preflight health checks
 * - File upload (in-memory base64 PDF/image) and goal validation
 * - Serial multi-role pipeline execution over real SSE stream
 * - Mid-pipeline failure simulation and downstream role resumption via retry
 * - Markdown and JSON export artifact generation
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { startStudioServer } from '../harness.mjs';

async function collectSseEvents(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let pending = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    let cut;

    while ((cut = pending.indexOf('\n\n')) !== -1) {
      const frame = pending.slice(0, cut);
      pending = pending.slice(cut + 2);

      let eventType = 'message';
      let dataPayload = '';

      frame.split('\n').forEach((line) => {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataPayload += line.slice(5).trim();
        }
      });

      if (dataPayload) {
        try {
          events.push({ event: eventType, data: JSON.parse(dataPayload) });
        } catch {
          events.push({ event: eventType, data: dataPayload });
        }
      }
    }
  }

  return events;
}

test('e2e - Complete Workflow: Upload/Goal -> Serial Roles -> Synthesis -> Export', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // 1. User loads Studio homepage
  const homeRes = await fetch(`${studio.base}/`);
  assert.equal(homeRes.status, 200);
  const html = await homeRes.text();
  assert.match(html, /รู้ทันหนังสือราชการ/);

  // 2. Preflight check in demo mode
  const statusRes = await fetch(`${studio.base}/api/status?demo=true`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.ok, true);

  // 3. User submits goal + simulated document attachment
  const goal = 'หนังสือแจ้งประเมินภาษีที่ดินและสิ่งปลูกสร้าง ประจำปี 2569 ยอด 4,500 บาท';
  const attachment = {
    filename: 'tax-notice-2569.pdf',
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,JVBERi0xLjQKJXRlc3QK',
  };

  const runRes = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal,
      attachment,
      model: 'gemini-3.1-flash-lite',
      isDemo: true,
      privacyConsent: true,
    }),
  });

  assert.equal(runRes.status, 200);
  assert.match(runRes.headers.get('content-type'), /text\/event-stream/);

  const events = await collectSseEvents(runRes);

  assert.ok(events.some((e) => e.event === 'pipeline_start'));

  // Strict serial progression
  const startRoles = events.filter((e) => e.event === 'role_start').map((e) => e.data.roleId);
  assert.deepEqual(startRoles, ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer']);

  const doneRoles = events.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRoles, ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer']);

  const completeEvent = events.find((e) => e.event === 'complete');
  assert.ok(completeEvent);
  const runResult = completeEvent.data;
  assert.equal(runResult.goal, goal);
  assert.equal(runResult.filename, 'tax-notice-2569.pdf');
  assert.ok(runResult.steps.interpreter.length > 50);
  assert.ok(runResult.steps.risk_checker.length > 50);
  assert.ok(runResult.steps.action_planner.length > 50);
  assert.ok(runResult.steps.final_synthesizer.length > 50);

  // 4. User exports run result to Markdown
  const exportMdRes = await fetch(`${studio.base}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run: runResult, format: 'markdown' }),
  });
  assert.equal(exportMdRes.status, 200);
  const mdText = await exportMdRes.text();
  assert.match(mdText, /รายงาน: รู้ทันหนังสือราชการ/);
  assert.match(mdText, /tax-notice-2569\.pdf/);
  assert.match(mdText, /ไม่ใช่คำยืนยันจากหน่วยงานราชการ/);
  assert.match(mdText, /การถอดรหัสภาษาราชการ/);
  assert.match(mdText, /การตรวจสอบความเสี่ยงและกำหนดเวลา/);
  assert.match(mdText, /แผนปฏิบัติการและเช็กลิสต์/);
  assert.match(mdText, /คู่มือรู้ทันหนังสือราชการฉบับประชาชน/);

  // 5. User exports run result to JSON
  const exportJsonRes = await fetch(`${studio.base}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run: runResult, format: 'json' }),
  });
  assert.equal(exportJsonRes.status, 200);
  const jsonData = await exportJsonRes.json();
  assert.equal(jsonData.app, 'รู้ทันหนังสือราชการ (Thai Official Document Explainer)');
  assert.equal(jsonData.run.goal, goal);

  // Verify export headers
  assert.match(exportMdRes.headers.get('content-disposition'), /official-doc-report\.md/);
  assert.match(exportJsonRes.headers.get('content-disposition'), /official-doc-report\.json/);
});

test('e2e - Validation Errors: missing inputs return HTTP 400 with informative errors', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // 1. /api/run without goal or attachment
  const emptyRunRes = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: '', attachment: null }),
  });
  assert.equal(emptyRunRes.status, 400);
  const emptyRunJson = await emptyRunRes.json();
  assert.match(emptyRunJson.error, /กรุณาระบุข้อความหรือแนบเอกสารราชการ/);

  // 2. /api/retry without roleId
  const emptyRetryRes = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'ทดสอบ' }),
  });
  assert.equal(emptyRetryRes.status, 400);
  const emptyRetryJson = await emptyRetryRes.json();
  assert.match(emptyRetryJson.error, /roleId is required/);

  // 3. /api/export without run payload
  const emptyExportRes = await fetch(`${studio.base}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'markdown' }),
  });
  assert.equal(emptyExportRes.status, 400);
  const emptyExportJson = await emptyExportRes.json();
  assert.match(emptyExportJson.error, /Run payload is required/);
});

test('e2e - Error Injection and Role Retry Workflow for Document Analysis', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const goal = 'ทดสอบการกู้คืนข้อผิดพลาดในการวิเคราะห์เอกสาร';

  // 1. Trigger error at 'risk_checker'
  const runRes = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal,
      model: 'gemini-3.1-flash-lite',
      isDemo: true,
      simulateErrorAtRole: 'risk_checker',
      privacyConsent: true,
    }),
  });

  const events = await collectSseEvents(runRes);

  const doneRoles = events.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRoles, ['interpreter']);

  const errorEvent = events.find((e) => e.event === 'role_error');
  assert.ok(errorEvent);
  assert.equal(errorEvent.data.roleId, 'risk_checker');

  // 2. User clicks Retry for risk_checker
  const retryRes = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: 'risk_checker',
      goal,
      stepsSoFar: { interpreter: 'สรุปการถอดรหัสเอกสาร' },
      model: 'gemini-3.1-flash-lite',
      isDemo: true,
      privacyConsent: true,
    }),
  });

  assert.equal(retryRes.status, 200);
  const retryEvents = await collectSseEvents(retryRes);
  const doneRolesAfterRetry = retryEvents.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRolesAfterRetry, ['risk_checker', 'action_planner', 'final_synthesizer'], 'Retry must resume downstream roles to completion');

  const completeEvent = retryEvents.find((e) => e.event === 'complete');
  assert.ok(completeEvent, 'Must emit complete event so user can export report');
  assert.ok(completeEvent.data.steps.final_synthesizer.length > 50);
});
