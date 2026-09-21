import test from 'node:test';
import assert from 'node:assert/strict';

import { validateThaiCitizenId, scanSensitiveData } from '../../lib/pii-detector.mjs';

test('pii-detector - validateThaiCitizenId validates MOD-11 checksum', () => {
  // Valid Thai Citizen IDs
  assert.equal(validateThaiCitizenId('1100201234561'), true);
  assert.equal(validateThaiCitizenId('1-1002-01234-56-1'), true);
  assert.equal(validateThaiCitizenId('1 1002 01234 56 1'), true);
  assert.equal(validateThaiCitizenId('1234567890121'), true, '123456789012 has checksum 1');
  assert.equal(validateThaiCitizenId('1-2345-67890-12-1'), true);

  // Checksum mismatch
  assert.equal(validateThaiCitizenId('1234567890126'), false, '1234567890126 has invalid checksum (expected 1)');
  assert.equal(validateThaiCitizenId('1100201234567'), false);
  assert.equal(validateThaiCitizenId('1234567890120'), false);
  assert.equal(validateThaiCitizenId('0000000000000'), false);

  // Invalid length / characters / edge cases
  assert.equal(validateThaiCitizenId('123456789'), false);
  assert.equal(validateThaiCitizenId('12345678901234'), false);
  assert.equal(validateThaiCitizenId('1-1002-01234-56-A'), false);
  assert.equal(validateThaiCitizenId(''), false);
  assert.equal(validateThaiCitizenId(null), false);
  assert.equal(validateThaiCitizenId(undefined), false);
});

test('pii-detector - scanSensitiveData detects 13-digit Thai Citizen IDs and redacts them', () => {
  const text = 'หนังสือแจ้งเรื่อง นายสมชาย มีเลขประจำตัวประชาชน 1-1002-01234-56-1 ต้องมาชำระภาษี';
  const result = scanSensitiveData(text);

  assert.equal(result.hasPii, true);
  assert.ok(result.warnings.length > 0);
  assert.match(result.warnings[0], /พบเลขประจำตัวประชาชน 13 หลัก/);
  assert.match(result.warnings[0], /ตรวจสอบผลรวมถูกต้อง/);
  assert.ok(result.redactedText.includes('[เลขบัตรประชาชนถูกปิดบัง]'));
  assert.ok(!result.redactedText.includes('1-1002-01234-56-1'));
});

test('pii-detector - scanSensitiveData detects Official Secrecy classifications', () => {
  const secret1 = 'หนังสือราชการนี้จัดอยู่ในชั้น ลับที่สุด ห้ามเผยแพร่';
  const res1 = scanSensitiveData(secret1);
  assert.equal(res1.hasPii, true);
  assert.match(res1.warnings[0], /ลับที่สุด/);

  const secret2 = 'เรื่อง ลับมาก การจัดซื้อจัดจ้างพิเศษ';
  const res2 = scanSensitiveData(secret2);
  assert.equal(res2.hasPii, true);
  assert.match(res2.warnings[0], /ลับมาก/);

  const secret3 = 'เอกสารฉบับนี้เป็น เอกสารลับ ประจำปี 2569';
  const res3 = scanSensitiveData(secret3);
  assert.equal(res3.hasPii, true);
  assert.match(res3.warnings[0], /เอกสารลับ/);

  const secret4 = 'จัดส่งทาง หนังสือลับ ถึงผู้ว่าราชการ';
  const res4 = scanSensitiveData(secret4);
  assert.equal(res4.hasPii, true);
  assert.match(res4.warnings[0], /หนังสือลับ/);

  const secret5 = 'หนังสือแจ้งความประเมิน ชั้น ลับ';
  const res5 = scanSensitiveData(secret5);
  assert.equal(res5.hasPii, true);
  assert.match(res5.warnings[0], /ลับ/);
});

test('pii-detector - scanSensitiveData does not falsely flag standard Thai words', () => {
  // Words containing "ลับ" sound/cluster like สำหรับ, สลับ, กลับ, หลับ must NOT trigger secrecy warnings
  const safeText = 'เอกสารนี้มีไว้สำหรับประชาชนเพื่อตรวจสอบรายละเอียด ไม่มีความสลับซับซ้อน และให้เดินทางกลับบ้านไปนอนหลับ';
  const result = scanSensitiveData(safeText);

  assert.equal(result.hasPii, false);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.redactedText, safeText);
});

test('pii-detector - scanSensitiveData handles empty or non-string inputs safely', () => {
  assert.deepEqual(scanSensitiveData(''), { hasPii: false, warnings: [], redactedText: '' });
  assert.deepEqual(scanSensitiveData(null), { hasPii: false, warnings: [], redactedText: '' });
  assert.deepEqual(scanSensitiveData(undefined), { hasPii: false, warnings: [], redactedText: '' });
});
