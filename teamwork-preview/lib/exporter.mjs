/**
 * Report Exporter: Markdown and JSON Generator for "รู้ทันหนังสือราชการ"
 */

/**
 * Formats full run output into a structured Markdown document.
 * @param {Object} run
 * @returns {string} Clean Markdown text
 */
export function formatRunToMarkdown(run) {
  const timestamp = run.createdAt || new Date().toISOString();
  const modeLabel = run.isDemo ? 'โหมดจำลอง (Demo Mode)' : 'เชื่อมต่อจริง (AiPASS Live)';
  const fileLabel = run.filename ? `เอกสารแนบ: \`${run.filename}\`` : 'โจทย์ข้อความ';

  return `# 📜 รายงาน: รู้ทันหนังสือราชการ (Thai Official Document Action Guide)
*สร้างเมื่อ: ${timestamp} | โหมด: ${modeLabel} | โมเดล: \`${run.model || 'N/A'}\` | ${fileLabel}*

> ⚠️ **ข้อสงวนสิทธิ์สำคัญ**: เอกสารนี้จัดทำขึ้นโดยระบบ AI เพื่อช่วยแปลความหมายและจัดระเบียบสิ่งที่ต้องทำในเบื้องต้นเท่านั้น **ไม่ใช่คำยืนยันจากหน่วยงานราชการ และไม่สามารถใช้เป็นหลักฐานทางกฎหมายแทนเอกสารจริงได้** โปรดตรวจสอบกับต้นฉบับและหน่วยงานผู้ออกเอกสารเสมอ

---

## 🎯 1. ข้อมูลนำเข้าและคำถามของผู้ใช้
${(run.goal || 'ไม่มีบันทึกคำถามเพิ่มเติม').trim()}

---

## 📜 2. การถอดรหัสภาษาราชการ (Interpreter)
${(run.steps?.interpreter || 'ไม่มีข้อมูล').trim()}

---

## ⚠️ 3. การตรวจสอบความเสี่ยงและกำหนดเวลา (Risk Checker)
${(run.steps?.risk_checker || 'ไม่มีข้อมูล').trim()}

---

## 📋 4. แผนปฏิบัติการและเช็กลิสต์ (Action Planner)
${(run.steps?.action_planner || 'ไม่มีข้อมูล').trim()}

---

## ⚡ 5. คู่มือรู้ทันหนังสือราชการฉบับประชาชน (Final Synthesis)
${(run.steps?.final_synthesizer || 'ไม่มีข้อมูล').trim()}

---
*จัดทำโดย ระบบรู้ทันหนังสือราชการ — ขับเคลื่อนด้วย Serial Teamwork Engine บน AiPASS*
`;
}

/**
 * Formats full run output into a structured JSON string.
 * @param {Object} run
 * @returns {string} JSON string
 */
export function formatRunToJson(run) {
  return JSON.stringify(
    {
      app: 'รู้ทันหนังสือราชการ (Thai Official Document Explainer)',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      run: {
        ...run,
        // Omit heavy raw binary data from exports if present
        attachment: run.attachment ? { filename: run.attachment.filename, mimeType: run.attachment.mimeType } : null,
      },
    },
    null,
    2
  );
}
