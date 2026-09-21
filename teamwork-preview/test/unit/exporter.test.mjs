import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRunToMarkdown, formatRunToJson } from '../../lib/exporter.mjs';

test('exporter - formatRunToMarkdown includes disclaimer and all 4 official document roles', () => {
  const run = {
    goal: 'หนังสือแจ้งประเมินภาษี',
    filename: 'tax-notice.pdf',
    model: 'gemini-3.1-flash-lite',
    isDemo: true,
    createdAt: '2026-09-04T10:00:00.000Z',
    steps: {
      interpreter: '1. สรุปภาพรวม: หนังสือแจ้งประเมินภาษี',
      risk_checker: '2. กำหนดชำระ 30 เมษายน เบี้ยปรับ 40%',
      action_planner: '3. เตรียมบัตรประชาชนและสำเนาโฉนด',
      final_synthesizer: '4. คู่มือฉบับประชาชน 7 หมวดหมู่',
    },
  };

  const md = formatRunToMarkdown(run);

  assert.match(md, /รู้ทันหนังสือราชการ/);
  assert.match(md, /ไม่ใช่คำยืนยันจากหน่วยงานราชการ/);
  assert.match(md, /tax-notice\.pdf/);
  assert.match(md, /การถอดรหัสภาษาราชการ \(Interpreter\)/);
  assert.match(md, /การตรวจสอบความเสี่ยงและกำหนดเวลา \(Risk Checker\)/);
  assert.match(md, /แผนปฏิบัติการและเช็กลิสต์ \(Action Planner\)/);
  assert.match(md, /คู่มือรู้ทันหนังสือราชการฉบับประชาชน \(Final Synthesis\)/);
});

test('exporter - formatRunToMarkdown handles live mode and missing steps gracefully', () => {
  const liveRun = {
    goal: '',
    filename: null,
    model: 'gemini-3.1-flash-lite',
    isDemo: false,
    steps: null,
  };

  const md = formatRunToMarkdown(liveRun);
  assert.match(md, /เชื่อมต่อจริง \(AiPASS Live\)/);
  assert.match(md, /โจทย์ข้อความ/);
  assert.match(md, /ไม่มีบันทึกคำถามเพิ่มเติม/);
  assert.match(md, /ไม่มีข้อมูล/);
});

test('exporter - formatRunToJson sanitizes raw binary data and preserves file metadata', () => {
  const runWithAttachment = {
    goal: 'วิเคราะห์เอกสารแนบ',
    model: 'gemini-3.1-flash-lite',
    attachment: {
      filename: 'secret-document.pdf',
      mimeType: 'application/pdf',
      dataUri: 'data:application/pdf;base64,QUxMVEhFQklHQkFTRTY0REFUQQ==',
    },
    steps: {
      interpreter: 'ผลลัพธ์',
      risk_checker: 'ผลลัพธ์',
      action_planner: 'ผลลัพธ์',
      final_synthesizer: 'ผลลัพธ์',
    },
  };

  const jsonStr = formatRunToJson(runWithAttachment);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.run.attachment.filename, 'secret-document.pdf');
  assert.equal(parsed.run.attachment.mimeType, 'application/pdf');
  assert.equal(parsed.run.attachment.dataUri, undefined, 'dataUri must be omitted to prevent bloated exports');
  assert.ok(parsed.exportedAt, 'Must include ISO timestamp');
  assert.ok(!isNaN(Date.parse(parsed.exportedAt)));
});
