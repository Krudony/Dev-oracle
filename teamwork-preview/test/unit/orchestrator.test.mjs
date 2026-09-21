import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDERED_ROLE_IDS,
  buildPromptForRole,
  runSerialPipeline,
  retryRole,
} from '../../lib/orchestrator.mjs';

test('orchestrator - ORDERED_ROLE_IDS enforces strict serial order for document pipeline', () => {
  assert.deepEqual(ORDERED_ROLE_IDS, ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer']);
});

test('orchestrator - buildPromptForRole correctly routes to all 4 roles and throws on invalid', () => {
  assert.throws(() => buildPromptForRole('unknown_role', 'goal'), /Unknown role/);

  const p1 = buildPromptForRole('interpreter', 'เป้าหมาย', {}, true);
  assert.match(p1, /เป้าหมาย/);
  assert.match(p1, /ถอดรหัส/);

  const p2 = buildPromptForRole('risk_checker', 'เป้าหมาย', { interpreter: 'ข้อมูลถอดรหัส' });
  assert.match(p2, /ข้อมูลถอดรหัส/);
  assert.match(p2, /ความเสี่ยง/);

  const p3 = buildPromptForRole('action_planner', 'เป้าหมาย', {
    interpreter: 'ข้อมูลถอดรหัส',
    risk_checker: 'ข้อมูลความเสี่ยง',
  });
  assert.match(p3, /ข้อมูลความเสี่ยง/);
  assert.match(p3, /แผนปฏิบัติการ/);

  const p4 = buildPromptForRole('final_synthesizer', 'เป้าหมาย', {
    interpreter: 'ข้อมูลถอดรหัส',
    risk_checker: 'ข้อมูลความเสี่ยง',
    action_planner: 'ข้อมูลแผนงาน',
  });
  assert.match(p4, /ข้อมูลแผนงาน/);
  assert.match(p4, /คู่มือรู้ทันหนังสือราชการฉบับประชาชน/);
});

test('orchestrator - runSerialPipeline propagates attachment metadata and streams chunks', async () => {
  const events = [];
  const goal = 'หนังสือแจ้งภาษี';
  const attachment = {
    filename: 'tax-2026.pdf',
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,JVBERi0xLjQKJXRlc3QK',
  };

  const result = await runSerialPipeline({
    goal,
    attachment,
    model: 'gemini-3.1-flash-lite',
    isDemo: true,
    onEvent: (event, data) => events.push({ event, data }),
  });

  assert.equal(result.hasAttachment, true);
  assert.equal(result.filename, 'tax-2026.pdf');

  const startEvent = events.find((e) => e.event === 'pipeline_start');
  assert.ok(startEvent);
  assert.equal(startEvent.data.hasAttachment, true);
  assert.equal(startEvent.data.filename, 'tax-2026.pdf');

  const chunkEvents = events.filter((e) => e.event === 'chunk');
  assert.ok(chunkEvents.length > 0, 'Chunk events must be emitted during pipeline execution');
});

test('orchestrator - handles simulated error at first role and halts before any role completes', async () => {
  const events = [];
  await assert.rejects(
    async () => {
      await runSerialPipeline({
        goal: 'ทดสอบ Error ขั้นแรก',
        isDemo: true,
        simulateErrorAtRole: 'interpreter',
        onEvent: (event, data) => events.push({ event, data }),
      });
    },
    /Simulated failure in role: interpreter/
  );

  const doneRoles = events.filter((e) => e.event === 'role_done');
  assert.equal(doneRoles.length, 0, 'No roles should have completed');

  const errorEvents = events.filter((e) => e.event === 'role_error');
  assert.equal(errorEvents.length, 1);
  assert.equal(errorEvents[0].data.roleId, 'interpreter');
});

test('orchestrator - retryRole emits role_error and throws if role is invalid', async () => {
  const events = [];
  await assert.rejects(
    async () => {
      await retryRole({
        roleId: 'invalid_role_id',
        goal: 'ทดสอบ',
        stepsSoFar: {},
        isDemo: true,
        onEvent: (event, data) => events.push({ event, data }),
      });
    },
    /Unknown role/
  );

  const errEvent = events.find((e) => e.event === 'role_error');
  assert.ok(errEvent);
  assert.equal(errEvent.data.roleId, 'invalid_role_id');
});

test('orchestrator - runSerialPipeline executes all 4 document roles serially', async () => {
  const events = [];
  const goal = 'หนังสือแจ้งประเมินภาษีที่ดินและสิ่งปลูกสร้าง';

  const result = await runSerialPipeline({
    goal,
    model: 'gemini-3.1-flash-lite',
    isDemo: true,
    onEvent: (event, data) => {
      events.push({ event, data });
    },
  });

  // Verify all 4 roles have non-empty outputs
  assert.ok(result.steps.interpreter.length > 0, 'Interpreter output must not be empty');
  assert.ok(result.steps.risk_checker.length > 0, 'Risk Checker output must not be empty');
  assert.ok(result.steps.action_planner.length > 0, 'Action Planner output must not be empty');
  assert.ok(result.steps.final_synthesizer.length > 0, 'Final Synthesizer output must not be empty');

  // Verify event sequence
  const eventTypes = events.map((e) => e.event);
  assert.equal(eventTypes[0], 'pipeline_start');
  assert.equal(eventTypes[eventTypes.length - 1], 'complete');

  const startRoles = events.filter((e) => e.event === 'role_start').map((e) => e.data.roleId);
  assert.deepEqual(startRoles, ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer']);

  const doneRoles = events.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRoles, ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer']);
});

test('orchestrator - handles simulated error and stops serial progression', async () => {
  const events = [];
  const goal = 'ทดสอบ Error';

  await assert.rejects(
    async () => {
      await runSerialPipeline({
        goal,
        isDemo: true,
        simulateErrorAtRole: 'risk_checker',
        onEvent: (event, data) => events.push({ event, data }),
      });
    },
    /Simulated failure in role: risk_checker/
  );

  const doneRoles = events.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRoles, ['interpreter'], 'Only interpreter should have finished');

  const errorEvents = events.filter((e) => e.event === 'role_error');
  assert.equal(errorEvents.length, 1);
  assert.equal(errorEvents[0].data.roleId, 'risk_checker');
});

test('orchestrator - retryRole successfully re-runs a single role', async () => {
  const events = [];
  const goal = 'ทดสอบ Retry';
  const stepsSoFar = { interpreter: 'สรุปการถอดรหัสเอกสาร' };

  const output = await retryRole({
    roleId: 'risk_checker',
    goal,
    stepsSoFar,
    isDemo: true,
    onEvent: (event, data) => events.push({ event, data }),
  });

  assert.ok(output);
  assert.ok(output.steps?.risk_checker?.length > 0 || output.length > 0);
  const doneEvent = events.find((e) => e.event === 'role_done' && e.data.roleId === 'risk_checker');
  assert.ok(doneEvent);
  assert.equal(doneEvent.data.roleId, 'risk_checker');
  const completeEvent = events.find((e) => e.event === 'complete');
  assert.ok(completeEvent, 'Retry must emit complete event after downstream roles finish');
});

test('orchestrator - runSerialPipeline halts immediately when AbortSignal is triggered', async () => {
  const events = [];
  const controller = new AbortController();

  await assert.rejects(
    async () => {
      await runSerialPipeline({
        goal: 'ทดสอบ Abort Signal',
        isDemo: true,
        signal: controller.signal,
        onEvent: (event, data) => {
          events.push({ event, data });
          if (event === 'role_done' && data.roleId === 'interpreter') {
            controller.abort();
          }
        },
      });
    },
    /aborted/i
  );

  const doneRoles = events.filter((e) => e.event === 'role_done').map((e) => e.data.roleId);
  assert.deepEqual(doneRoles, ['interpreter'], 'Downstream roles must not execute after abort');
  assert.ok(!events.some((e) => e.event === 'complete'), 'Complete event must not fire after abort');
});

test('orchestrator - runSerialPipeline clears attachment.dataUri from memory after interpreter completes', async () => {
  const attachment = {
    filename: 'doc.pdf',
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,QUxMVEhFQklHQkFTRTY0REFUQQ==',
  };

  const result = await runSerialPipeline({
    goal: 'ทดสอบ memory buffer clearing',
    attachment,
    isDemo: true,
    onEvent: () => {},
  });

  assert.equal(attachment.dataUri, null, 'dataUri must be cleared from attachment object to free memory');
  assert.equal(result.hasAttachment, true);
  assert.equal(result.attachment.filename, 'doc.pdf');
  assert.equal(result.attachment.mimeType, 'application/pdf');
});
