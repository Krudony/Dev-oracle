/**
 * PII and Thai Government Official Secrecy Scanner
 * Zero-dependency module for detecting Thai Citizen IDs and Official Secrecy classifications.
 */

/**
 * Validates 13-digit Thai Citizen ID checksum (MOD 11).
 * Algorithm:
 * 1. Sum d_i * (13 - i) for i = 0 to 11
 * 2. Check digit = (11 - (sum % 11)) % 10
 * 3. Valid if check digit matches d_12 (13th digit)
 * @param {string} idStr
 * @returns {boolean}
 */
export function validateThaiCitizenId(idStr) {
  if (!idStr || typeof idStr !== 'string') return false;
  const digits = idStr.replace(/[-\s]/g, '');
  if (digits.length !== 13 || !/^\d{13}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(digits[12], 10);
}

/**
 * Scans text for sensitive Thai PII (13-digit citizen IDs) and Official Secrecy markers.
 * @param {string} text
 * @returns {{ hasPii: boolean, warnings: string[], redactedText: string }}
 */
export function scanSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, warnings: [], redactedText: '' };
  }

  const warnings = [];
  let redacted = text;

  // 1. Thai Citizen ID (13 digits formatted e.g. 1-1002-01234-56-7 or unformatted 13 digits)
  const idRegex = /(?<!\d)(\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1})(?!\d)/g;
  let idMatch;
  while ((idMatch = idRegex.exec(text)) !== null) {
    const rawMatch = idMatch[1];
    const cleanDigits = rawMatch.replace(/[-\s]/g, '');
    if (cleanDigits.length === 13) {
      const isValid = validateThaiCitizenId(cleanDigits);
      warnings.push(
        `พบเลขประจำตัวประชาชน 13 หลัก (${rawMatch}${isValid ? ' - ตรวจสอบผลรวมถูกต้อง' : ''})`
      );
    }
  }
  redacted = redacted.replace(idRegex, '[เลขบัตรประชาชนถูกปิดบัง]');

  // 2. Official Secrecy Classifications (ระเบียบว่าด้วยการรักษาความลับของทางราชการ พ.ศ. 2544)
  // Ordered from longest to shortest; standalone "ลับ" uses negative lookarounds to avoid Thai words like สลับ, กลับ, หลับ
  const secrecyRegex = /(ลับที่สุด|ลับมาก|เอกสารลับ|หนังสือลับ|(?<![\u0E00-\u0E7F])ลับ(?![\u0E00-\u0E7F]))/g;
  let secMatch;
  while ((secMatch = secrecyRegex.exec(text)) !== null) {
    warnings.push(
      `พบเครื่องหมายชั้นความลับทางราชการ ("${secMatch[1]}") — ห้ามส่งเอกสารลับเข้าสู่ระบบ AI`
    );
  }

  return {
    hasPii: warnings.length > 0,
    warnings,
    redactedText: redacted,
  };
}
