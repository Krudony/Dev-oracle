/**
 * PII and Thai Government Official Secrecy Scanner
 * Part of Security Invariant D (Redaction Warning & PII Detection)
 */

/**
 * Validates 13-digit Thai Citizen ID using standard MOD 11 checksum algorithm.
 * @param {string} idStr - 13-digit ID string (with or without dashes/spaces)
 * @returns {boolean}
 */
export function validateThaiCitizenId(idStr) {
  const digits = (idStr || '').replace(/[-\s]/g, '');
  if (digits.length !== 13 || !/^\d{13}$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(digits[12], 10);
}

/**
 * Scans text for sensitive Thai PII and Official Secrecy markers.
 * @param {string} text - Text to scan
 * @returns {{ hasPii: boolean, warnings: string[], detections: Array<{type: string, matched: string, label: string}>, redactedText: string }}
 */
export function scanSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, warnings: [], detections: [], redactedText: '' };
  }

  const warnings = [];
  const detections = [];
  let redacted = text;

  // 1. Thai Citizen ID (13 digits formatted or raw)
  const idRegex = /\b(\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1})\b/g;
  let idMatch;
  while ((idMatch = idRegex.exec(text)) !== null) {
    const cleanDigits = idMatch[1].replace(/[-\s]/g, '');
    if (cleanDigits.length === 13) {
      const isValid = validateThaiCitizenId(cleanDigits);
      detections.push({
        type: 'THAI_CITIZEN_ID',
        matched: idMatch[1],
        label: 'เลขบัตรประจำตัวประชาชน 13 หลัก',
        validChecksum: isValid,
      });
      warnings.push(`พบเลขประจำตัวประชาชน 13 หลัก: ${idMatch[1]}${isValid ? ' (ผลรวมเลข 13 หลักถูกต้อง)' : ''}`);
    }
  }
  redacted = redacted.replace(idRegex, '[เลขบัตรประชาชนถูกปิดบัง]');

  // 2. Official Secrecy Classifications (ระเบียบว่าด้วยการรักษาความลับของทางราชการ พ.ศ. 2544)
  const secrecyRegex = /(ลับที่สุด|ลับมาก|\bเอกสารลับ\b|\bหนังสือลับ\b)/g;
  let secMatch;
  while ((secMatch = secrecyRegex.exec(text)) !== null) {
    detections.push({
      type: 'OFFICIAL_SECRECY',
      matched: secMatch[1],
      label: 'ชั้นความลับทางราชการ',
    });
    warnings.push(`พบเครื่องหมายชั้นความลับทางราชการ ("${secMatch[1]}") — ห้ามส่งเอกสารลับเข้าสู่ระบบ AI`);
  }

  return {
    hasPii: warnings.length > 0,
    warnings,
    detections,
    redactedText: redacted,
  };
}
