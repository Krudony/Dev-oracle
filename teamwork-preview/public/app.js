/**
 * รู้ทันหนังสือราชการ — Frontend Client Controller
 */

// Application State
const state = {
  isDemo: false,
  bridgeReady: false,
  isSampleLoaded: false,
  isRunning: false,
  isReadingFile: false,
  fileReadSequence: 0,
  currentGoal: '',
  attachment: null, // { filename, mimeType, dataUri }
  selectedModel: 'gemini-3.1-flash-lite',
  preflightSequence: 0,
  steps: {
    interpreter: '',
    risk_checker: '',
    action_planner: '',
    final_synthesizer: '',
  },
  lastRun: null,
};

// DOM Elements
const elements = {
  bridgePill: document.getElementById('bridgePill'),
  bridgeDot: document.getElementById('bridgeDot'),
  bridgeText: document.getElementById('bridgeText'),
  creditBadge: document.getElementById('creditBadge'),
  creditText: document.getElementById('creditText'),
  demoToggle: document.getElementById('demoToggle'),
  dropzone: document.getElementById('dropzone'),
  dropzoneContent: document.getElementById('dropzoneContent'),
  fileInput: document.getElementById('fileInput'),
  filePill: document.getElementById('filePill'),
  fileName: document.getElementById('fileName'),
  fileSize: document.getElementById('fileSize'),
  removeFileBtn: document.getElementById('removeFileBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  documentInput: document.getElementById('documentInput'),
  goalInput: document.getElementById('goalInput'),
  consentCheckbox: document.getElementById('consentCheckbox'),
  modelSelect: document.getElementById('modelSelect'),
  runBtn: document.getElementById('runBtn'),
  resetBtn: document.getElementById('resetBtn'),
  demoResultNotice: document.getElementById('demoResultNotice'),
  exportPanel: document.getElementById('exportPanel'),
  exportMdBtn: document.getElementById('exportMdBtn'),
  printBtn: document.getElementById('printBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  toast: document.getElementById('toast'),
};

/**
 * Displays a non-blocking toast notification.
 */
function showToast(message, duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, duration);
}

function updateRunAvailability() {
  if (state.isRunning) return;
  const canRun = state.bridgeReady && !state.isReadingFile;
  elements.runBtn.disabled = !canRun;
  if (state.isReadingFile) {
    elements.runBtn.innerHTML = '<span class="btn-icon">⏳</span> กำลังอ่านไฟล์...';
  } else {
    elements.runBtn.innerHTML = canRun
      ? '<span class="btn-icon">✨</span> ช่วยอ่านเอกสารนี้'
      : '<span class="btn-icon">⏳</span> รอเชื่อมต่อ AiPASS';
  }
}

/**
 * Initializes and checks preflight status of AiPASS Bridge / Mock Mode.
 */
async function checkPreflight() {
  const requestSequence = ++state.preflightSequence;
  const isDemo = elements.demoToggle.checked;
  state.isDemo = isDemo;
  if (!isDemo) elements.demoResultNotice.hidden = true;

  elements.bridgeDot.className = 'status-dot loading';
  elements.bridgeText.textContent = 'กำลังตรวจเช็ก...';
  elements.modelSelect.disabled = true;

  try {
    const query = isDemo ? '?demo=true' : '';
    const [statusRes, modelsRes, creditsRes] = await Promise.all([
      fetch(`/api/status${query}`).then((r) => r.json()),
      fetch(`/api/models${query}`).then((r) => r.json()),
      fetch(`/api/credits${query}`).then((r) => r.json()).catch(() => null),
    ]);
    if (requestSequence !== state.preflightSequence) return;

    if (isDemo || statusRes.mode === 'demo') {
      state.bridgeReady = true;
      elements.bridgeDot.className = 'status-dot demo';
      elements.bridgeText.textContent = 'โหมดตัวอย่างเท่านั้น';
      elements.creditText.textContent = 'โหมดตัวอย่าง • ไม่ใช้เครดิต';
    } else if (statusRes.ready) {
      state.bridgeReady = true;
      elements.bridgeDot.className = 'status-dot online';
      elements.bridgeText.textContent = 'พร้อมใช้ AiPASS จริง';
      const cred = statusRes.credits || creditsRes || {};
      const avail = cred.available ?? cred.remaining;
      const limit = cred.limit ?? cred.total;
      if (avail !== undefined && limit !== undefined) {
        elements.creditText.textContent = `เครดิต: ${avail} / ${limit}`;
      } else if (avail !== undefined) {
        elements.creditText.textContent = `เครดิต: ${avail}`;
      } else {
        elements.creditText.textContent = 'เครดิต: พร้อม';
      }
    } else if (statusRes.code === 'MULTIPLE_AIPASS_EXTENSIONS') {
      state.bridgeReady = false;
      elements.bridgeDot.className = 'status-dot offline';
      elements.bridgeText.textContent = `พบ AiPASS ซ้ำ ${statusRes.extensions} ตัว`;
      elements.creditText.textContent = 'ปิด extension ที่ซ้ำให้เหลือ 1 ตัว';
    } else if (statusRes.bridgeRunning) {
      state.bridgeReady = false;
      elements.bridgeDot.className = 'status-dot demo';
      elements.bridgeText.textContent = 'ยังไม่เชื่อมต่อ AiPASS';
      elements.creditText.textContent = 'ไม่มีข้อมูลเครดิต';
    } else {
      state.bridgeReady = false;
      elements.bridgeDot.className = 'status-dot offline';
      elements.bridgeText.textContent = 'AiPASS ยังไม่พร้อม';
      elements.creditText.textContent = '-';
    }

    const chatModels = Array.isArray(modelsRes)
      ? modelsRes.filter((model) => (model.kind || 'chat') === 'chat')
      : [];
    if (chatModels.length > 0) {
      const previousModel = elements.modelSelect.value || state.selectedModel;
      elements.modelSelect.innerHTML = '';
      chatModels.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        const freeBadge = m.free_credit ? ' [ฟรีเครดิต]' : '';
        opt.textContent = `${m.name || m.id}${freeBadge}`;
        elements.modelSelect.appendChild(opt);
      });
      const preferredModel = chatModels.some((model) => model.id === previousModel)
        ? previousModel
        : (chatModels.some((model) => model.id === statusRes.defaultModel)
          ? statusRes.defaultModel
          : chatModels[0].id);
      elements.modelSelect.value = preferredModel;
      state.selectedModel = preferredModel;
    } else if (!isDemo) {
      state.bridgeReady = false;
      elements.modelSelect.innerHTML = '<option value="">ยังโหลดโมเดลสำหรับอ่านเอกสารไม่ได้</option>';
      elements.bridgeDot.className = 'status-dot offline';
      elements.bridgeText.textContent = 'ยังโหลดโมเดลจาก AiPASS ไม่ได้';
    }
  } catch (err) {
    if (requestSequence !== state.preflightSequence) return;
    state.bridgeReady = false;
    elements.bridgeDot.className = 'status-dot offline';
    elements.bridgeText.textContent = 'ระบบยังไม่พร้อม';
    elements.creditText.textContent = '-';
  }

  if (!state.isRunning) {
    elements.modelSelect.disabled = !state.bridgeReady;
    updateRunAvailability();
  }
}

/**
 * Formats file size in readable format.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Handles file selection and converts to Base64 in memory.
 */
function handleFile(file) {
  if (!file) return;
  if (state.isRunning) return;

  if (elements.demoToggle.checked) {
    elements.demoToggle.checked = false;
    state.isSampleLoaded = false;
    checkPreflight();
    showToast('ไฟล์จริงจะวิเคราะห์ด้วย AiPASS เท่านั้น');
  }

  const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['pdf', 'jpg', 'jpeg', 'png'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    showToast('กรุณาเลือกไฟล์ PDF, JPG หรือ PNG เท่านั้น');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 5 MB)');
    return;
  }

  invalidateDisplayedResult();
  state.attachment = null;
  elements.filePill.style.display = 'none';
  elements.dropzoneContent.style.display = 'block';
  const readSequence = ++state.fileReadSequence;
  state.isReadingFile = true;
  elements.fileInput.disabled = true;
  elements.dropzone.classList.add('is-disabled');
  elements.dropzone.setAttribute('aria-disabled', 'true');
  elements.dropzone.tabIndex = -1;
  updateRunAvailability();

  const reader = new FileReader();
  reader.onload = (e) => {
    if (readSequence !== state.fileReadSequence) return;
    state.isReadingFile = false;
    if (state.isRunning) return;
    let mime = file.type;
    if (!mime) {
      if (ext === 'pdf') mime = 'application/pdf';
      else if (ext === 'png') mime = 'image/png';
      else mime = 'image/jpeg';
    }

    state.attachment = {
      filename: file.name,
      mimeType: mime,
      dataUri: e.target.result,
    };
    state.isSampleLoaded = false;
    invalidateDisplayedResult();

    elements.dropzoneContent.style.display = 'none';
    elements.filePill.style.display = 'inline-flex';
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = `(${formatBytes(file.size)})`;
    elements.fileInput.disabled = false;
    elements.dropzone.classList.remove('is-disabled');
    elements.dropzone.setAttribute('aria-disabled', 'false');
    elements.dropzone.tabIndex = 0;
    updateRunAvailability();
    showToast(`แนบไฟล์ ${file.name} เรียบร้อยแล้ว`);
  };

  reader.onerror = () => {
    if (readSequence !== state.fileReadSequence) return;
    state.isReadingFile = false;
    if (state.isRunning) return;
    elements.fileInput.disabled = false;
    elements.dropzone.classList.remove('is-disabled');
    elements.dropzone.setAttribute('aria-disabled', 'false');
    elements.dropzone.tabIndex = 0;
    updateRunAvailability();
    showToast('เกิดข้อผิดพลาดในการอ่านไฟล์');
  };

  reader.readAsDataURL(file);
}

/**
 * Removes attached file.
 */
function clearFile() {
  state.fileReadSequence += 1;
  state.isReadingFile = false;
  state.attachment = null;
  elements.fileInput.value = '';
  elements.dropzoneContent.style.display = 'block';
  elements.filePill.style.display = 'none';
  if (!state.isRunning) {
    elements.fileInput.disabled = false;
    elements.dropzone.classList.remove('is-disabled');
    elements.dropzone.setAttribute('aria-disabled', 'false');
    elements.dropzone.tabIndex = 0;
    updateRunAvailability();
  }
}

function invalidateDisplayedResult() {
  if (state.isRunning) return;
  state.lastRun = null;
  elements.demoResultNotice.hidden = true;
  elements.exportPanel.style.display = 'none';
  document.body.classList.remove('has-started');
}

function setComposerLocked(locked) {
  elements.documentInput.disabled = locked;
  elements.goalInput.disabled = locked;
  elements.fileInput.disabled = locked;
  elements.removeFileBtn.disabled = locked;
  elements.loadSampleBtn.disabled = locked;
  elements.consentCheckbox.disabled = locked;
  elements.resetBtn.disabled = locked;
  elements.modelSelect.disabled = locked || !state.bridgeReady;
  elements.dropzone.classList.toggle('is-disabled', locked);
  elements.dropzone.setAttribute('aria-disabled', String(locked));
  elements.dropzone.tabIndex = locked ? -1 : 0;
}

/**
 * Resets pipeline UI elements to initial state.
 */
function resetPipelineUI() {
  const roles = ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer'];
  roles.forEach((r) => {
    const badge = document.getElementById(`stepBadge-${r}`);
    const tag = document.getElementById(`tag-${r}`);
    const stateText = document.getElementById(`stateText-${r}`);
    const content = document.getElementById(`content-${r}`);
    const retryBtn = document.getElementById(`retry-${r}`);

    if (badge) badge.className = 'step-badge';
    if (tag) tag.textContent = 'รอคิว';
    if (stateText) stateText.textContent = 'รอคิว';
    if (content) content.innerHTML = `<div class="placeholder-text">รอดำเนินการ...</div>`;
    if (retryBtn) retryBtn.style.display = 'none';

    state.steps[r] = '';
  });

  elements.exportPanel.style.display = 'none';
}

function onRoleStart(roleId) {
  const badge = document.getElementById(`stepBadge-${roleId}`);
  const tag = document.getElementById(`tag-${roleId}`);
  const stateText = document.getElementById(`stateText-${roleId}`);
  const content = document.getElementById(`content-${roleId}`);
  const retryBtn = document.getElementById(`retry-${roleId}`);

  if (badge) badge.className = 'step-badge active';
  if (tag) tag.textContent = 'กำลังคิด...';
  if (stateText) stateText.textContent = 'กำลังประมวลผล...';
  if (content) content.textContent = '';
  if (retryBtn) retryBtn.style.display = 'none';
}

function onRoleChunk(roleId, chunk) {
  const content = document.getElementById(`content-${roleId}`);
  if (content) {
    content.textContent += chunk;
    content.scrollTop = content.scrollHeight;
  }
  state.steps[roleId] += chunk;
}

/**
 * Turns the model's plain Markdown-like response into readable, safe sections.
 * Text is always assigned through textContent; no model HTML is injected.
 */
function renderReadableResult(roleId) {
  const content = document.getElementById(`content-${roleId}`);
  const text = state.steps[roleId]?.trim();
  if (!content || !text) return;

  const groups = [];
  let current = { title: '', lines: [] };
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const heading = line.match(/^#{1,4}\s+(?:\d+\.\s*)?(.+)$/);
    if (heading) {
      if (current.title || current.lines.length) groups.push(current);
      current = {
        title: heading[1]
          .replace(/\*\*/g, '')
          .replace(/\s*\([A-Za-z][A-Za-z &/-]*\)\s*/g, '')
          .trim(),
        lines: [],
      };
    } else if (line) {
      current.lines.push(line);
    }
  }
  if (current.title || current.lines.length) groups.push(current);

  if (roleId === 'final_synthesizer') {
    const priority = (group) => {
      const title = group.title;
      if (/กำหนดเวลา|วันที่/.test(title)) return 0;
      if (/สิ่งที่ต้องทำ|Action/.test(title)) return 1;
      if (/เอกสารที่ต้องเตรียม/.test(title)) return 2;
      if (/ความเสี่ยง/.test(title)) return 3;
      if (/สรุปเอกสาร/.test(title)) return 4;
      return 5;
    };
    groups.sort((a, b) => priority(a) - priority(b));
  }

  const fragment = document.createDocumentFragment();
  groups.forEach((group, index) => {
    const section = document.createElement('section');
    section.className = 'answer-section';
    if (/กำหนดเวลา|วันที่/.test(group.title)) section.classList.add('deadline-section');
    if (/สิ่งที่ต้องทำ|Action/.test(group.title)) section.classList.add('action-section');

    if (group.title) {
      const heading = document.createElement('h4');
      heading.textContent = group.title;
      section.appendChild(heading);
    } else if (index === 0 && roleId === 'final_synthesizer') {
      section.classList.add('answer-intro');
    }

    group.lines.forEach((rawLine) => {
      const line = rawLine.replace(/\*\*/g, '').replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '');
      const item = document.createElement('p');
      if (/^[-*]\s+/.test(rawLine) || /^\d+[.)]\s+/.test(rawLine)) {
        item.className = 'answer-item';
        const mark = document.createElement('span');
        mark.textContent = '✓';
        item.append(mark, document.createTextNode(line));
      } else {
        item.textContent = line;
      }
      section.appendChild(item);
    });
    fragment.appendChild(section);
  });

  content.replaceChildren(fragment);
}

function onRoleDone(roleId) {
  const badge = document.getElementById(`stepBadge-${roleId}`);
  const tag = document.getElementById(`tag-${roleId}`);
  const stateText = document.getElementById(`stateText-${roleId}`);
  const retryBtn = document.getElementById(`retry-${roleId}`);

  if (badge) badge.className = 'step-badge done';
  if (tag) tag.textContent = 'เสร็จสิ้น';
  if (stateText) stateText.textContent = 'วิเคราะห์เสร็จสมบูรณ์';
  if (retryBtn) retryBtn.style.display = 'inline-flex';
  renderReadableResult(roleId);
}

function onRoleError(roleId, errorMsg) {
  const badge = document.getElementById(`stepBadge-${roleId}`);
  const tag = document.getElementById(`tag-${roleId}`);
  const stateText = document.getElementById(`stateText-${roleId}`);
  const content = document.getElementById(`content-${roleId}`);
  const retryBtn = document.getElementById(`retry-${roleId}`);

  if (badge) badge.className = 'step-badge error';
  if (tag) tag.textContent = 'ผิดพลาด';
  if (stateText) stateText.textContent = `ข้อผิดพลาด: ${errorMsg}`;
  if (content && !content.textContent.trim()) {
    content.replaceChildren();
    const errDiv = document.createElement('div');
    errDiv.style.color = 'var(--accent-danger)';
    errDiv.textContent = `⚠️ ข้อผิดพลาด: ${errorMsg}`;
    content.appendChild(errDiv);
  }
  if (retryBtn) retryBtn.style.display = 'inline-flex';
}

/**
 * Consumes SSE Stream from response.
 */
async function consumeSseStream(response, { onEvent, onError }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      // Normalize CRLF to LF to support both \r\n and \n framing
      pending = pending.replace(/\r\n/g, '\n');
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
          let parsedPayload = dataPayload;
          try {
            parsedPayload = JSON.parse(dataPayload);
          } catch {
            // Keep raw string
          }
          // Invoke callback outside JSON parse try/catch so callback exceptions are not misattributed
          onEvent(eventType, parsedPayload);
        }
      }
    }

    if (pending.trim()) {
      const frame = pending.trim();
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
        let parsedPayload = dataPayload;
        try {
          parsedPayload = JSON.parse(dataPayload);
        } catch {}
        onEvent(eventType, parsedPayload);
      }
    }
  } catch (err) {
    onError?.(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Validates 13-digit Thai Citizen ID checksum (MOD 11).
 */
function validateThaiCitizenId(idStr) {
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
 */
function scanSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, warnings: [], redactedText: '' };
  }

  const warnings = [];
  let redacted = text;

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

/**
 * Runs the complete document analysis pipeline.
 */
async function handleRunPipeline() {
  if (state.isReadingFile) {
    showToast('กรุณารอให้อ่านไฟล์เสร็จก่อนเริ่มวิเคราะห์');
    return;
  }
  if (!elements.consentCheckbox.checked) {
    showToast('กรุณากดยินยอมรับทราบนโยบายความเป็นส่วนตัวก่อนเริ่ม');
    elements.consentCheckbox.focus();
    return;
  }

  const documentText = elements.documentInput.value.trim();
  const question = elements.goalInput.value.trim();

  if (!elements.demoToggle.checked && !state.bridgeReady) {
    showToast('ยังไม่เชื่อมต่อ AiPASS กรุณารอให้สถานะพร้อมใช้งานจริง');
    return;
  }

  if (elements.demoToggle.checked && !state.isSampleLoaded) {
    showToast('โหมดตัวอย่างใช้ได้เฉพาะข้อความสาธิต กรุณากด “ลองใช้ข้อความตัวอย่าง”');
    return;
  }
  if (!documentText && !state.attachment) {
    showToast('กรุณาแนบไฟล์ หรือวางข้อความจากหนังสือ');
    elements.documentInput.focus();
    return;
  }

  const goal = [
    documentText ? `ข้อความจากหนังสือ:\n${documentText}` : '',
    question ? `คำถามที่อยากรู้เป็นพิเศษ:\n${question}` : '',
  ].filter(Boolean).join('\n\n');

  // Pre-submission PII & Secrecy Warning check
  if (goal) {
    const piiScan = scanSensitiveData(goal);
    if (piiScan.hasPii) {
      const proceed = confirm(
        `⚠️ คำเตือนความปลอดภัยและความเป็นส่วนตัว:\n` +
        piiScan.warnings.join('\n') +
        `\n\nต้องการดำเนินการต่อหรือไม่? แนะนำให้กด "ยกเลิก" เพื่อปิดบังข้อมูลก่อนส่ง`
      );
      if (!proceed) return;
    }
  }

  state.currentGoal = goal || (state.attachment ? `วิเคราะห์เอกสาร ${state.attachment.filename}` : '');
  state.selectedModel = elements.modelSelect.value;
  state.isRunning = true;
  setComposerLocked(true);
  elements.demoResultNotice.hidden = true;
  document.body.classList.add('has-started');
  elements.runBtn.disabled = true;
  elements.runBtn.innerHTML = '<span class="btn-icon">⏳</span> กำลังช่วยอ่าน...';

  resetPipelineUI();
  requestAnimationFrame(() => {
    document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  let completeReceived = false;

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: state.currentGoal,
        attachment: state.attachment,
        model: state.selectedModel,
        isDemo: elements.demoToggle.checked,
        privacyConsent: elements.consentCheckbox.checked,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    await consumeSseStream(res, {
      onEvent: (event, data) => {
        switch (event) {
          case 'role_start':
            onRoleStart(data.roleId);
            break;
          case 'chunk':
            onRoleChunk(data.roleId, data.chunk);
            break;
          case 'role_done':
            onRoleDone(data.roleId);
            break;
          case 'role_error':
            state.steps[data.roleId] = ''; // Clear partial text on failure
            onRoleError(data.roleId, data.error);
            showToast(`⚠️ ขั้นตอน ${data.roleId} ผิดพลาด สามารถกดปุ่ม "ลองใหม่" ได้`);
            throw new Error(`ขั้นตอน ${data.roleId} ล้มเหลว: ${data.error}`);
          case 'complete':
            completeReceived = true;
            state.lastRun = data;
            elements.demoResultNotice.hidden = data.isDemo !== true;
            elements.exportPanel.style.display = 'block';
            showToast('🎉 วิเคราะห์หนังสือราชการเสร็จสมบูรณ์!');
            break;
        }
      },
      onError: (err) => {
        showToast(`ข้อผิดพลาดระหว่างสตรีม: ${err.message}`);
      },
    });

    if (!completeReceived) {
      throw new Error('การวิเคราะห์สิ้นสุดก่อนได้รับสัญญาณ complete ที่สมบูรณ์');
    }
  } catch (err) {
    showToast(`เกิดข้อผิดพลาด: ${err.message}`);
  } finally {
    state.isRunning = false;
    setComposerLocked(false);
    elements.runBtn.disabled = !state.bridgeReady;
    elements.runBtn.innerHTML = state.bridgeReady
      ? '<span class="btn-icon">✨</span> ช่วยอ่านเอกสารนี้'
      : '<span class="btn-icon">⏳</span> รอเชื่อมต่อ AiPASS';
  }
}

/**
 * Retries a specific role with single server ownership over downstream completion.
 */
async function handleRetryRole(roleId) {
  if (state.isRunning) return;
  if (state.isReadingFile) {
    showToast('กรุณารอให้อ่านไฟล์เสร็จก่อนลองใหม่');
    return;
  }

  const roles = ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer'];
  const startIndex = roles.indexOf(roleId);
  if (startIndex === -1) return;

  state.selectedModel = elements.modelSelect.value || state.selectedModel;
  state.isRunning = true;
  setComposerLocked(true);
  elements.runBtn.disabled = true;

  // Clear downstream partial states so no stale or partial text lingers
  for (let i = startIndex; i < roles.length; i++) {
    const r = roles[i];
    state.steps[r] = '';
    const badge = document.getElementById(`stepBadge-${r}`);
    const tag = document.getElementById(`tag-${r}`);
    const stateText = document.getElementById(`stateText-${r}`);
    const content = document.getElementById(`content-${r}`);
    const retryBtn = document.getElementById(`retry-${r}`);

    if (badge) badge.className = 'step-badge';
    if (tag) tag.textContent = 'รอคิว';
    if (stateText) stateText.textContent = 'รอคิว';
    if (content) content.innerHTML = `<div class="placeholder-text">รอดำเนินการ...</div>`;
    if (retryBtn) retryBtn.style.display = 'none';
  }

  elements.exportPanel.style.display = 'none';
  showToast(`กำลังเริ่มลองใหม่ขั้นตอน: ${roleId}...`);

  let completeReceived = false;

  try {
    const res = await fetch('/api/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId,
        goal: state.currentGoal,
        attachment: state.attachment,
        stepsSoFar: state.steps,
        model: state.selectedModel,
        isDemo: elements.demoToggle.checked,
        privacyConsent: elements.consentCheckbox.checked,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    await consumeSseStream(res, {
      onEvent: (event, data) => {
        switch (event) {
          case 'role_start':
            onRoleStart(data.roleId);
            break;
          case 'chunk':
            onRoleChunk(data.roleId, data.chunk);
            break;
          case 'role_done':
            onRoleDone(data.roleId);
            break;
          case 'role_error':
            state.steps[data.roleId] = ''; // Clear partial text on failure
            onRoleError(data.roleId, data.error);
            showToast(`⚠️ ขั้นตอน ${data.roleId} ผิดพลาด สามารถกดปุ่ม "ลองใหม่" ได้`);
            throw new Error(`ขั้นตอน ${data.roleId} ล้มเหลว: ${data.error}`);
          case 'complete':
            completeReceived = true;
            state.lastRun = data;
            elements.demoResultNotice.hidden = data.isDemo !== true;
            elements.exportPanel.style.display = 'block';
            showToast('🎉 วิเคราะห์หนังสือราชการเสร็จสมบูรณ์!');
            break;
        }
      },
      onError: (err) => {
        showToast(`ข้อผิดพลาดระหว่างสตรีม: ${err.message}`);
      },
    });

    if (!completeReceived) {
      throw new Error('การลองใหม่สิ้นสุดก่อนได้รับสัญญาณ complete ที่สมบูรณ์');
    }
  } catch (err) {
    showToast(`ลองใหม่ไม่สำเร็จ: ${err.message}`);
  } finally {
    state.isRunning = false;
    setComposerLocked(false);
    elements.runBtn.disabled = !state.bridgeReady;
    elements.runBtn.innerHTML = state.bridgeReady
      ? '<span class="btn-icon">✨</span> ช่วยอ่านเอกสารนี้'
      : '<span class="btn-icon">⏳</span> รอเชื่อมต่อ AiPASS';
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupEvents() {
  elements.demoToggle.addEventListener('change', () => {
    state.isSampleLoaded = false;
    checkPreflight();
    showToast(elements.demoToggle.checked ? 'ใช้โหมดตัวอย่าง' : 'ใช้ AI จริง');
  });

  // Drag and Drop & Keyboard activation
  elements.dropzone.addEventListener('click', (e) => {
    if (e.target !== elements.removeFileBtn) {
      elements.fileInput.click();
    }
  });

  elements.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target !== elements.removeFileBtn) {
        e.preventDefault();
        elements.fileInput.click();
      }
    }
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  });

  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  elements.removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
    invalidateDisplayedResult();
    showToast('ลบไฟล์แนบแล้ว');
  });

  // Load sample text button
  elements.loadSampleBtn.addEventListener('click', () => {
    clearFile();
    invalidateDisplayedResult();
    elements.documentInput.value = 'ได้รับหนังสือแจ้งประเมินภาษีที่ดินและสิ่งปลูกสร้าง ยอด ๔,๕๐๐ บาท กำหนดชำระภายใน ๓๐ เมษายน แต่ขนาดเนื้อที่และประเภทบ้านพักอาศัยไม่ตรงกับความเป็นจริง';
    elements.goalInput.value = 'ต้องทำอย่างไร และยื่นคัดค้านได้ภายในกี่วัน';
    elements.demoToggle.checked = false;
    state.isSampleLoaded = false;
    checkPreflight();
    showToast('ใส่ข้อความตัวอย่างแล้ว พร้อมวิเคราะห์ด้วย AiPASS จริง');
  });

  elements.modelSelect.addEventListener('change', () => {
    state.selectedModel = elements.modelSelect.value;
    invalidateDisplayedResult();
    const label = elements.modelSelect.options[elements.modelSelect.selectedIndex]?.text || state.selectedModel;
    showToast(`เลือกโมเดล ${label}`);
  });

  elements.runBtn.addEventListener('click', handleRunPipeline);

  elements.resetBtn.addEventListener('click', () => {
    elements.documentInput.value = '';
    elements.goalInput.value = '';
    state.currentGoal = '';
    state.lastRun = null;
    state.isSampleLoaded = false;
    elements.demoToggle.checked = false;
    clearFile();
    resetPipelineUI();
    elements.demoResultNotice.hidden = true;
    document.body.classList.remove('has-started');
    document.getElementById('pageTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('พร้อมอ่านเอกสารฉบับใหม่');
  });

  elements.documentInput.addEventListener('input', () => {
    state.isSampleLoaded = false;
    invalidateDisplayedResult();
    if (elements.demoToggle.checked) {
      elements.demoToggle.checked = false;
      checkPreflight();
    }
  });
  elements.goalInput.addEventListener('input', () => {
    state.isSampleLoaded = false;
    invalidateDisplayedResult();
    if (elements.demoToggle.checked) {
      elements.demoToggle.checked = false;
      checkPreflight();
    }
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const el = document.getElementById(targetId);
      if (el && el.textContent.trim()) {
        navigator.clipboard.writeText(el.textContent.trim());
        showToast('คัดลอกข้อความแล้ว 📋');
      }
    });
  });

  // Retry buttons
  ['interpreter', 'risk_checker', 'action_planner', 'final_synthesizer'].forEach((roleId) => {
    const retryBtn = document.getElementById(`retry-${roleId}`);
    if (retryBtn) {
      retryBtn.addEventListener('click', () => handleRetryRole(roleId));
    }
  });

  // Print button
  elements.printBtn.addEventListener('click', () => {
    window.print();
  });

  // Export buttons
  elements.exportMdBtn.addEventListener('click', async () => {
    const runPayload = state.lastRun || {
      goal: state.currentGoal,
      filename: state.attachment?.filename || null,
      model: state.selectedModel,
      isDemo: elements.demoToggle.checked,
      steps: state.steps,
    };
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run: runPayload, format: 'markdown' }),
    });
    const markdown = await res.text();
    downloadFile(markdown, 'official-doc-action-guide.md', 'text/markdown;charset=utf-8');
    showToast('ดาวน์โหลดไฟล์ Markdown เรียบร้อย');
  });

  elements.copyAllBtn.addEventListener('click', async () => {
    const runPayload = state.lastRun || {
      goal: state.currentGoal,
      filename: state.attachment?.filename || null,
      model: state.selectedModel,
      isDemo: elements.demoToggle.checked,
      steps: state.steps,
    };
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run: runPayload, format: 'markdown' }),
    });
    const markdown = await res.text();
    navigator.clipboard.writeText(markdown);
    showToast('คัดลอกเอกสารทั้งหมดลง Clipboard แล้ว');
  });

  elements.exportJsonBtn.addEventListener('click', async () => {
    const runPayload = state.lastRun || {
      goal: state.currentGoal,
      filename: state.attachment?.filename || null,
      model: state.selectedModel,
      isDemo: elements.demoToggle.checked,
      steps: state.steps,
    };
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run: runPayload, format: 'json' }),
    });
    const jsonStr = await res.text();
    downloadFile(jsonStr, 'official-doc-report.json', 'application/json;charset=utf-8');
    showToast('ดาวน์โหลดไฟล์ JSON เรียบร้อย');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  checkPreflight();
});
