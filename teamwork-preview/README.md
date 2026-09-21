# 📜 รู้ทันหนังสือราชการ (Thai Official Document Explainer & Action Guide)

> สตูดิโอถอดรหัสเอกสารราชการเป็นภาษาง่าย พร้อมเช็กลิสต์สิ่งที่ต้องทำ กำหนดเวลา และความเสี่ยงทางกฎหมาย  
> พัฒนาสำหรับ [AiPASS](https://aipass.go.th/) โดยต่อยอดสถาปัตยกรรม Serial Multi-Role Engine จาก `niawjunior/aipass-bridge`

---

## 📖 1. ที่มาและแนวคิดของผลิตภัณฑ์ (Product Concept)

ประชาชนชาวไทยมักได้รับหนังสือราชการหรือเอกสารสำคัญจากหน่วยงานรัฐ เช่น **หนังสือแจ้งประเมินภาษีที่ดินและสิ่งปลูกสร้าง, หนังสือเรียกตรวจสอบ/ชี้แจง, เอกสารแจ้งสิทธิ์ หรือหนังสือเตือน** ซึ่งมักใช้ภาษากฎหมายที่เป็นทางการและซับซ้อน ทำให้เกิดความกังวลว่า:
1. *หนังสือนี้หมายถึงอะไร มีผลกระทบอย่างไร?*
2. *มีกำหนดเวลาเส้นตายถึงวันไหน และมีเบี้ยปรับหรือไม่?*
3. *ต้องเตรียมเอกสารอะไรบ้าง และต้องไปติดต่อที่ไหน?*
4. *ควรจะถามเจ้าหน้าที่อย่างไรเพื่อปกป้องสิทธิของตนเอง?*

**“รู้ทันหนังสือราชการ”** ถูกพัฒนาขึ้นตามข้อกำหนดในเอกสาร **`0923_AIPASS_ADVISOR.md`** เพื่อแก้ปัญหานี้โดยตรง:
ผู้ใช้เพียงอัปโหลดไฟล์ (PDF/JPG/PNG) หรือพิมพ์ข้อความจากหนังสือราชการ ระบบจะนำเข้าสู่กระบวนการวิเคราะห์ต่อเนื่อง 4 บทบาทแบบ **Serial** เพื่อส่งมอบ **คำอธิบายภาษาง่าย และ เช็กลิสต์การลงมือทำ** ทันที!

---

## ⚡ 2. สถาปัตยกรรมภายใน: Serial Teamwork Engine

ระบบขับเคลื่อนด้วยการทำงานต่อเนื่อง 4 บทบาทแบบ **SERIAL** เพื่อขจัดปัญหา Race Condition ของบทสนทนาบน AiPASS Bridge:

```text
[ผู้ใช้อัปโหลดเอกสาร PDF/ภาพ + คำถาม]
                 │
                 ▼
[1. 📜 Interpreter (ผู้ถอดรหัสภาษาราชการ)]
   - แปลงภาษากฎหมาย/ระเบียบราชการเป็นภาษาชาวบ้าน
   - ระบุหน่วยงานผู้ออกเอกสารและวัตถุประสงค์หลัก
                 │
                 ▼
[2. ⚠️ Risk Checker (ผู้ตรวจสอบความเสี่ยงและกำหนดเวลา)]
   - ค้นหากำหนดเวลาเส้นตาย (ทั้ง พ.ศ./ค.ศ. และเลขไทย)
   - ระบุค่าปรับ บทลงโทษ และผลกระทบทางกฎหมายหากเพิกเฉย
                 │
                 ▼
[3. 📋 Action Planner (ผู้วางแผนและจัดทำเช็กลิสต์)]
   - เรียงลำดับสิ่งที่ประชาชนต้องทำทีละขั้นตอน (1, 2, 3...)
   - รายการเอกสารที่ต้องนำไปติดต่อ และคำถามที่ควรถามเจ้าหน้าที่
                 │
                 ▼
[4. ⚡ Final Synthesizer (ผู้สังเคราะห์คู่มือฉบับประชาชน)]
   - รวบรวมข้อสรุปทั้ง 7 หมวดหมู่มาตรฐานตามเกณฑ์ราชการ
   - พร้อมพิมพ์ (Print), คัดลอก หรือดาวน์โหลดเป็น Markdown
```

---

## 🛡️ 3. มาตรการความปลอดภัยและความเป็นส่วนตัว (Privacy & Security)

เอกสารราชการอาจมีข้อมูลส่วนบุคคลอ่อนไหว ระบบจึงยึดมั่นตามข้อกำหนดด้านความปลอดภัยอย่างเข้มงวด:

1. **คำแนะนำปิดบังข้อมูล (Redaction Advisory)**: แนะนำให้ประชาชนขีดฆ่า/ปิดบัง เลขบัตรประชาชน 13 หลัก, ลายมือชื่อ และเลขบัญชีธนาคารก่อนอัปโหลด พร้อมระบบตรวจสอบ PII อัตโนมัติที่หน้าบ้าน
2. **ประมวลผลในหน่วยความจำเท่านั้น (Memory-Only)**: ไฟล์และรูปภาพที่อัปโหลดจะถูกแปลงเป็น Base64 ใน Memory ชั่วคราว **ไม่มีการบันทึกไฟล์หรือรูปภาพลงดิสก์ของเซิร์ฟเวอร์โดยเด็ดขาด**
3. **การตรวจสอบไฟล์และลายเซ็นดิจิทัล (Magic Bytes & MIME Verification)**:
   - ตรวจสอบความสอดคล้องระหว่าง MIME metadata และคำนำหน้า Data URI
   - ตรวจสอบลายเซ็นไบนารีระดับล่าง (Magic Bytes) ของไฟล์โดยตรง ได้แก่ PDF (`%PDF-`), JPEG (`\xFF\xD8\xFF`), และ PNG (`\x89PNG\r\n\x1a\n`) ป้องกันการปลอมแปลงนามสกุลไฟล์
   - จำกัดขนาดไฟล์ไม่เกิน 5MB หลังถอดรหัส Base64
4. **การสนทนาชั่วคราว (Temporary Conversation & Fail-Closed Privacy)**: สร้าง Session แบบ `temporary: true` บน AiPASS ก่อนเริ่มส่งข้อความวิเคราะห์เสมอ (ทั้งในรอบแรกและรอบ Retry) หากสร้างไม่สำเร็จจะปฏิเสธการรันทันที (Fail-Closed) ไม่ส่งต่อเข้า Permanent History
5. **ระบบควบคุมการทำงานพร้อมกัน (Server-Side Concurrency Lock & HTTP 409)**:
   - เนื่องจากแท็บบราวเซอร์ของ AiPASS Bridge เป็นสถานะเดี่ยวแบบ Process-Global หากมีคำขอวิเคราะห์ Live 2 งานพร้อมกัน อาจเกิดการสลับแท็บสนทนาและเอกสารปะปนกัน
   - เซิร์ฟเวอร์จึงมี Concurrency Lock: หากมี Live Pipeline หรือ Live Retry กำลังทำงานอยู่ คำขอ Live ถัดไปจะถูกปฏิเสธทันทีด้วยรหัส **HTTP 409 Conflict** (`CONCURRENT_LIVE_RUN_REJECTED`)
   - ต้องเชื่อม AiPASS extension **เพียง 1 ชุด** เท่านั้น หากตรวจพบมากกว่า 1 ชุด ระบบจะปิดปุ่มวิเคราะห์และปฏิเสธ Live API ด้วย HTTP 503 (`MULTIPLE_AIPASS_EXTENSIONS`) ก่อนสร้างบทสนทนาหรือใช้เครดิต เพื่อป้องกันข้อความสตรีมซ้ำ
6. **ความปลอดภัยเครือข่าย (Localhost-Only & Anti-DNS Rebinding & CSRF Guard)**:
   - ผูกติดเฉพาะ `127.0.0.1` ไม่เปิดให้ภายนอกเข้าถึง
   - ตรวจสอบ `Host` header ป้องกันการโจมตีแบบ DNS Rebinding โดยตรวจสอบความถูกต้องของพอร์ตและปฏิเสธ Malformed Host เช่น `localhost:evil` หรือ `[::1]evil`
   - บล็อก Untrusted Origin ด้วย HTTP 403 Forbidden และห้ามเปิด CORS Wildcard (`*`)
   - บังคับ `Content-Type: application/json` สำหรับ API POST ทั้งหมด ป้องกันการยิง CSRF จากเว็บไซต์ภายนอก
   - ป้องกันการหลุดของสตรีม (Premature EOF): ตรวจสอบสัญญาณ `[DONE]` เสมอ หากสตรีมตัดขาดก่อนจะแจ้งเตือนความผิดพลาด ไม่ถือว่าขั้นตอนเสร็จสิ้น
7. **การเข้าถึงสำหรับทุกคน (Accessibility / a11y)**: Dropzone รองรับการใช้งานผ่านแป้นพิมพ์ (Enter/Space พร้อม Focus ring) และมี ARIA Live Regions (`polite` และ `assertive`) สำหรับแจ้งสถานะและข้อผิดพลาดแก่โปรแกรมอ่านหน้าจอ
8. **ข้อสงวนสิทธิ์ชัดเจน (Transparent Disclaimer)**: แสดงคำเตือนกำกับทุกรายงานว่า *"ไม่ใช่คำยืนยันจากหน่วยงานราชการ โปรดตรวจสอบรายละเอียดกับหน่วยงานผู้ออกเอกสารเสมอ"*

---

## 🚀 4. วิธีติดตั้งและเริ่มใช้งาน (Quick Start)

โปรเจกต์นี้พัฒนาด้วย **Node.js (>= 18 ESM)** ล้วน ๆ **ไม่ต้องติดตั้ง npm dependencies เพิ่มเติม**:

### เริ่มต้นเซิร์ฟเวอร์:
```bash
cd /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview
node server.mjs
```

ข้อความเมื่อเซิร์ฟเวอร์พร้อม:
```text
====================================================
📜 รู้ทันหนังสือราชการ (Thai Official Document Explainer)
👉 UI Address : http://127.0.0.1:8788
🔗 Upstream   : http://127.0.0.1:8787
🔒 Security   : Localhost-only (DNS Rebinding Guarded)
====================================================
```

เปิดเว็บบราวเซอร์ไปที่:
👉 **`http://127.0.0.1:8788`**

---

## 🎮 5. วิธีใช้งานและโหมดการทำงาน (Operation Modes)

### 1) โหมดเชื่อมต่อจริง (AiPASS Live Mode) — *ค่าเริ่มต้น*

1. เปิด Bridge จาก `niawjunior/aipass-bridge` ด้วยคำสั่ง `npm run dev` (พอร์ต 8787)
2. โหลด Chrome Extension **เพียง 1 ชุด** และเปิด `https://de.aipass.net/chat` ในโปรไฟล์ที่ล็อกอินแล้ว
3. รัน `npm run doctor` ใน repo `aipass-bridge`; ต้องขึ้น `all good` และ `extension 1 attached`
4. เปิด `http://127.0.0.1:8788` รอข้อความ **“พร้อมใช้งานจริง”**
5. วางข้อความหรือแนบ PDF/JPG/PNG, ปิดบังข้อมูลส่วนบุคคล, ติ๊กยินยอม แล้วกด **“ช่วยอ่านเอกสารนี้”**

ถ้า Bridge หรือ extension ยังไม่พร้อม ปุ่มวิเคราะห์จะถูกปิดไว้ ระบบจะไม่สลับไปใช้ผลจำลองเอง

### 2) ข้อความตัวอย่าง

- ปุ่ม **“ลองตัวอย่างหนังสือภาษีที่ดิน”** ใส่ข้อความตัวอย่างในช่องกรอกเท่านั้น
- เมื่อกดวิเคราะห์ ข้อความตัวอย่างจะถูกส่งเข้า **AiPASS จริงด้วยโมเดลที่ผู้ใช้เลือก** เหมือนเอกสารอื่น ไม่มีการแสดงผล Mock ในหน้าใช้งานหลัก

---

## 🧪 6. คำสั่งรันชุดทดสอบ (Test Suite)

ชุดทดสอบครอบคลุมทั้ง **Unit Tests**, **Integration Tests**, **Official HTTP E2E Tests**, และ **Static UI Contract Tests** ผ่าน Node.js Test Runner:

```bash
cd /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview

# 1. รันการทดสอบทั้งหมด (Full Suite)
node --test test/**/*.test.mjs

# 2. รันเฉพาะ Unit Tests
npm run test:unit
# หรือ node --test test/unit/*.test.mjs

# 3. รันเฉพาะ Integration Tests (Proxy + Bridge Client + Concurrency Locks)
npm run test:integration
# หรือ node --test test/integration/*.test.mjs

# 4. รัน Official HTTP End-to-End Workflow Tests (Pipeline, Downstream Resumption, Exports)
npm run test:e2e
# หรือ node --test test/e2e/studio-workflow.test.mjs

# 5. รัน Static UI Contract & DOM Integrity Tests
npm run test:ui-contract
# หรือ node --test test/e2e/ui-contract.test.mjs
```

### รายละเอียดการทดสอบ:
- `prompts.test.mjs`: ตรวจสอบความถูกต้องของโครงสร้าง 4 บทบาท และข้อกำหนดหัวข้อรายงาน 7 ส่วน
- `orchestrator.test.mjs`: ตรวจสอบการรันแบบ Serial, การหยุดเมื่อเจอ Error, และการทำงานของปุ่ม Retry
- `sse-parser.test.mjs`: ตรวจสอบการรวม Packet สตรีมมิ่ง และการตรวจจับข้อผิดพลาด
- `exporter.test.mjs`: ตรวจสอบการส่งออกเอกสาร Markdown ที่มี Disclaimer และหัวข้อครบถ้วน
- `pii-detector.test.mjs`: ตรวจสอบการตรวจจับข้อมูลส่วนบุคคลอ่อนไหว (เลขบัตรประชาชน, เบอร์โทรศัพท์, อีเมล) และคำเตือน Redaction
- `proxy.test.mjs`: ทดสอบระบบป้องกัน DNS Rebinding (403), ความปลอดภัย CORS/CSRF (415), Payload Limits (413), และ **Concurrency Lock (ปฏิเสธ concurrent live run/retry ด้วย 409 Conflict)**
- `bridge-client.test.mjs`: ทดสอบการเชื่อมต่อ API ของ Bridge, การส่ง Attachment, และ **การสร้าง Temporary Conversation แบบ Fail-Closed ทั้งในรอบรันปกติและรอบ Retry**
- `studio-workflow.test.mjs` (**Official HTTP E2E Suite**): จำลองการทำงานสมบูรณ์ตั้งแต่ต้นจนจบผ่าน HTTP และ SSE: อัปโหลด ➔ สตรีมมิ่ง 4 บทบาท ➔ จำลอง Error ➔ กด Retry พร้อมรันขั้นตอนที่เหลือจนครบ ➔ ส่งออกรายงาน Markdown/JSON
- `ui-contract.test.mjs` (**Static UI Contract Suite**): ตรวจสอบสัญญาทางโครงสร้าง DOM, Dynamic CSS Classes, Event Binding, Explicit Consent และการป้องกัน XSS (Static Contract Verification)

### ⚠️ การวิเคราะห์ช่องว่างของการทดสอบระดับเบราว์เซอร์ (Testing & Browser Automation Gap Analysis)

- **ข้อกำหนด Zero External NPM Dependencies**: โครงการถูกออกแบบตามหลักสถาปัตยกรรมที่ใช้เฉพาะ Pure Node.js Built-ins (`node:test`, `node:assert/strict`, `node:http`) โดยมี `0 external dependencies` เพื่อความเบาและปลอดภัยสูงสุด
- **สถานะชุดทดสอบอัตโนมัติ**:
  1. **Official E2E**: ดำเนินการผ่าน HTTP API และ Server-Sent Events จริงใน `test/e2e/studio-workflow.test.mjs` ครอบคลุมวงจรชีวิตของระบบทั้งชุด
  2. **UI Verification**: เป็นการตรวจ **Static Contract & DOM Integrity** ใน `test/e2e/ui-contract.test.mjs` (ตรวจสอบ element IDs, dynamic class state, Event handlers, PII redaction warning, และ XSS Prevention ผ่าน Node.js) **มิใช่การจำลองผ่านเบราว์เซอร์จริง (Real Headless Browser Automation)**
- **การตรวจรับด้วยเบราว์เซอร์จริง**: รุ่นส่งมอบได้รับการตรวจผ่าน Chrome 152/CDP ทั้ง desktop/mobile และทดสอบ Live AiPASS ตั้งแต่กรอกเอกสารจนแสดงผลสำเร็จ การตรวจนี้เป็น release verification ภายนอกชุด `npm test` และไม่ได้เพิ่ม browser binary เป็น dependency ของโปรเจกต์

---

## 📂 7. โครงสร้างไฟล์ในโปรเจกต์ (Project Structure)

```text
teamwork-preview/
├── package.json               # คำสั่ง start, test:unit, test:integration, test:e2e, test:ui-contract
├── server.mjs                 # เซิร์ฟเวอร์หลัก: Localhost Proxy + Concurrency Mutex + Mock Engine + Static Server
├── README.md                  # เอกสารคู่มือภาษาไทยฉบับสมบูรณ์ (ไฟล์นี้)
├── lib/
│   ├── config.mjs             # การกำหนดค่าและความปลอดภัย (DNS Guard, Loopback)
│   ├── prompts.mjs            # Prompt Engineering สำหรับ 4 บทบาทถอดรหัสเอกสาร
│   ├── orchestrator.mjs       # Serial State Machine ควบคุมลำดับสตรีม, Temporary Session, และ Retry
│   ├── bridge-client.mjs      # ไคลเอนต์เชื่อมต่อ AiPASS Bridge HTTP API
│   ├── mock-bridge.mjs        # ข้อมูลจำลองหนังสือราชการและการสตรีมมิ่ง
│   ├── sse-parser.mjs         # ตัวแยกและประกอบเฟรม SSE
│   ├── pii-detector.mjs       # ตัวตรวจจับและเตือนข้อมูลส่วนบุคคล (PII Redaction Guard)
│   └── exporter.mjs           # ตัวแปลงผลลัพธ์เป็น Markdown (.md) และ JSON
├── public/
│   ├── index.html             # หน้าเว็บสตูดิโอ (HTML5 ภาษาไทย พร้อม Dropzone อัปโหลด)
│   ├── style.css              # หน้าตาแบบอ่านง่าย รองรับมือถือและ Print Stylesheet
│   └── app.js                 # คอนโทรลเลอร์ฝั่งบราวเซอร์ จัดการไฟล์และสตรีมมิ่ง
└── test/
    ├── harness.mjs            # Test Harness สุ่มพอร์ตและ Fake Bridge
    ├── unit/                  # ชุดการทดสอบระดับหน่วย
    │   ├── prompts.test.mjs
    │   ├── sse-parser.test.mjs
    │   ├── exporter.test.mjs
    │   ├── pii-detector.test.mjs
    │   └── orchestrator.test.mjs
    ├── integration/           # ชุดการทดสอบระบบต่อประสาน
    │   ├── proxy.test.mjs     # DNS guard, CORS, CSRF, Concurrency lock (409)
    │   └── bridge-client.test.mjs # Fail-closed temp sessions (run + retry)
    └── e2e/                   # ชุดการทดสอบแบบ End-to-End
        ├── studio-workflow.test.mjs # Official HTTP End-to-End Workflow Test
        └── ui-contract.test.mjs     # Static UI Contract & DOM Integrity
```

---
*จัดทำขึ้นสำหรับระบบนิเวศ Oracle โดย Dev Oracle (The Forgekeeper of Memory) ร่วมกับ Don*
