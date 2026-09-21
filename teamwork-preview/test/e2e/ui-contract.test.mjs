/**
 * UI & DOM Static Contract Verification
 *
 * NOTE ON TESTING METHODOLOGY & IDENTIFIED GAP:
 * These tests perform static analysis and contract verification on index.html, style.css, and app.js.
 * They verify element IDs, classes, consent defaults, redaction warnings, and XSS prevention using pure node:test.
 *
 * Identified Testing Gap: Real headless browser automation (e.g. Playwright, Puppeteer) is intentionally
 * NOT included in core repository dependencies to strictly honor the Zero-External-NPM-Dependency invariant.
 * Consequently, these tests are labeled as UI Contracts and must NOT be represented as real end-to-end browser tests.
 * The official E2E suite is `test/e2e/studio-workflow.test.mjs` which validates full HTTP and SSE lifecycles.
 * See README.md for the optional Playwright testing setup guide.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

test('ui-contract - DOM Contract Verification: all required IDs exist in index.html', () => {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const requiredIds = [
    'bridgePill',
    'bridgeDot',
    'bridgeText',
    'creditBadge',
    'creditText',
    'demoToggle',
    'dropzone',
    'dropzoneContent',
    'fileInput',
    'filePill',
    'fileName',
    'fileSize',
    'removeFileBtn',
    'loadSampleBtn',
    'goalInput',
    'consentCheckbox',
    'modelSelect',
    'runBtn',
    'resetBtn',
    'pipelineTracker',
    'stepBadge-interpreter',
    'stepBadge-risk_checker',
    'stepBadge-action_planner',
    'stepBadge-final_synthesizer',
    'tag-interpreter',
    'tag-risk_checker',
    'tag-action_planner',
    'tag-final_synthesizer',
    'stateText-interpreter',
    'stateText-risk_checker',
    'stateText-action_planner',
    'stateText-final_synthesizer',
    'content-interpreter',
    'content-risk_checker',
    'content-action_planner',
    'content-final_synthesizer',
    'retry-interpreter',
    'retry-risk_checker',
    'retry-action_planner',
    'retry-final_synthesizer',
    'exportPanel',
    'exportMdBtn',
    'printBtn',
    'copyAllBtn',
    'exportJsonBtn',
    'toast',
  ];

  for (const id of requiredIds) {
    const pattern = new RegExp(`id=["']${id}["']`);
    assert.ok(pattern.test(html), `index.html must contain element with id="${id}"`);
  }
});

test('ui-contract - CSS Classes Contract: stylesheet defines all essential component classes', () => {
  const cssPath = path.join(PUBLIC_DIR, 'style.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const requiredClasses = [
    '.app-container',
    '.status-pill',
    '.status-dot',
    '.privacy-note',
    '.model-picker',
    '.upload-dropzone',
    '.file-pill',
    '.consent-row',
    '.pipeline-tracker',
    '.step-badge',
    '.role-cards-grid',
    '.role-card',
    '.stream-container',
    '.answer-section',
    '.export-panel',
    '.toast',
  ];

  for (const cls of requiredClasses) {
    assert.ok(css.includes(cls), `style.css must contain class selector "${cls}"`);
  }
});

test('ui-contract - Static Analysis: all getElementById calls in app.js exist in index.html', () => {
  const jsPath = path.join(PUBLIC_DIR, 'app.js');
  const jsCode = fs.readFileSync(jsPath, 'utf-8');
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Find all document.getElementById('...') in app.js
  const matches = [...jsCode.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)];
  assert.ok(matches.length > 0, 'Must find getElementById references');

  for (const match of matches) {
    const id = match[1];
    const pattern = new RegExp(`id=["']${id}["']`);
    assert.ok(
      pattern.test(html),
      `Element ID "${id}" accessed in app.js must exist in index.html`
    );
  }
});

test('ui-contract - Copy Buttons: all data-target references point to valid DOM elements', () => {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const matches = [...html.matchAll(/class="[^"]*copy-btn[^"]*"[^>]*data-target="([^"]+)"/g)];
  assert.ok(matches.length >= 4, 'Must have at least 4 copy buttons for the 4 roles');

  for (const match of matches) {
    const targetId = match[1];
    const pattern = new RegExp(`id=["']${targetId}["']`);
    assert.ok(
      pattern.test(html),
      `Copy button target ID "${targetId}" must exist in index.html`
    );
  }
});

test('ui-contract - Dynamic CSS state classes used by app.js exist in style.css', () => {
  const cssPath = path.join(PUBLIC_DIR, 'style.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const dynamicSelectors = [
    '.status-dot.loading',
    '.status-dot.online',
    '.status-dot.demo',
    '.status-dot.offline',
    '.step-badge.active',
    '.step-badge.done',
    '.step-badge.error',
    '.toast.show',
    '.upload-dropzone.dragover',
    '.upload-dropzone.is-disabled',
  ];

  for (const selector of dynamicSelectors) {
    assert.ok(
      css.includes(selector),
      `style.css must contain dynamic selector "${selector}" manipulated by app.js`
    );
  }
});

test('ui-contract - Input specifications and privacy consent defaults', () => {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // File input accept attribute
  assert.match(html, /id="fileInput"[^>]*accept="\.pdf,image\/jpeg,image\/png"/);

  // Real AiPASS mode is the default; canned demo output must be explicitly selected.
  assert.ok(!/id="demoToggle"[^>]*checked/.test(html), 'Demo toggle must NOT be checked by default');

  // The model picker is a first-class visible control, not buried in collapsed settings.
  assert.match(html, /class="model-picker"[\s\S]*id="modelSelect"/);
  assert.ok(!/<details[^>]*>[\s\S]*id="modelSelect"[\s\S]*<\/details>/.test(html));

  // Consent checkbox requires explicit opt-in (must NOT be checked by default)
  assert.ok(!html.includes('id="consentCheckbox" checked'), 'Consent checkbox must NOT be checked by default (explicit affirmative consent)');

  // Role card IDs exist
  const roleCardIds = [
    'card-interpreter',
    'card-risk_checker',
    'card-action_planner',
    'card-final_synthesizer',
  ];
  for (const cardId of roleCardIds) {
    assert.ok(html.includes(`id="${cardId}"`), `index.html must include id="${cardId}"`);
  }
});

test('ui-contract - sample uses live AiPASS and model selection persists in state', () => {
  const jsCode = fs.readFileSync(path.join(PUBLIC_DIR, 'app.js'), 'utf-8');
  const sampleStart = jsCode.indexOf("elements.loadSampleBtn.addEventListener('click'");
  const sampleEnd = jsCode.indexOf("elements.runBtn.addEventListener('click'", sampleStart);
  const sampleHandler = jsCode.slice(sampleStart, sampleEnd);

  assert.ok(sampleStart >= 0 && sampleEnd > sampleStart, 'Sample click handler must exist');
  assert.match(sampleHandler, /demoToggle\.checked = false/);
  assert.ok(!/demoToggle\.checked = true/.test(sampleHandler), 'Sample must not turn on demo mode');
  assert.ok(jsCode.includes("elements.modelSelect.addEventListener('change'"));
  assert.ok(jsCode.includes("model.kind || 'chat') === 'chat'"));
});

test('ui-contract - composer inputs and model are locked during run and retry', () => {
  const jsCode = fs.readFileSync(path.join(PUBLIC_DIR, 'app.js'), 'utf-8');
  const lockStart = jsCode.indexOf('function setComposerLocked');
  const lockEnd = jsCode.indexOf('function resetPipelineUI', lockStart);
  const lockBody = jsCode.slice(lockStart, lockEnd);

  for (const control of ['documentInput', 'goalInput', 'fileInput', 'removeFileBtn', 'loadSampleBtn', 'consentCheckbox', 'resetBtn', 'modelSelect']) {
    assert.ok(lockBody.includes(`elements.${control}.disabled`), `${control} must participate in the run lock`);
  }
  assert.ok((jsCode.match(/setComposerLocked\(true\)/g) || []).length >= 2, 'Run and retry must both lock the composer');
  assert.ok((jsCode.match(/setComposerLocked\(false\)/g) || []).length >= 2, 'Run and retry must both unlock the composer');
});

test('ui-contract - file reading blocks run and stale FileReader callbacks are rejected', () => {
  const jsCode = fs.readFileSync(path.join(PUBLIC_DIR, 'app.js'), 'utf-8');
  assert.ok(jsCode.includes('isReadingFile: false'));
  assert.ok(jsCode.includes('fileReadSequence: 0'));
  assert.ok(jsCode.includes('const readSequence = ++state.fileReadSequence'));
  assert.ok(jsCode.includes('if (readSequence !== state.fileReadSequence) return'));
  assert.ok(jsCode.includes('state.bridgeReady && !state.isReadingFile'));
  assert.match(jsCode, /async function handleRunPipeline\(\) \{[\s\S]*?if \(state\.isReadingFile\)/);
  assert.match(jsCode, /async function handleRetryRole\(roleId\) \{[\s\S]*?if \(state\.isReadingFile\)/);
  assert.match(jsCode, /invalidateDisplayedResult\(\);[\s\S]*?state\.attachment = null;[\s\S]*?const readSequence/);
});

test('ui-contract - XSS Prevention: onRoleError does not inject raw HTML via innerHTML', () => {
  const jsPath = path.join(PUBLIC_DIR, 'app.js');
  const jsCode = fs.readFileSync(jsPath, 'utf-8');

  // Verify onRoleError uses textContent and createElement
  const onRoleErrorBlock = jsCode.slice(jsCode.indexOf('function onRoleError'));
  const fnEnd = onRoleErrorBlock.indexOf('function consumeSseStream');
  const fnBody = onRoleErrorBlock.slice(0, fnEnd);

  assert.ok(!fnBody.includes('innerHTML'), 'onRoleError must not assign to innerHTML');
  assert.ok(fnBody.includes('textContent'), 'onRoleError must use textContent for safe text insertion');
  assert.ok(fnBody.includes('createElement'), 'onRoleError must construct DOM node cleanly');
});

test('ui-contract - Redaction Warning: index.html explicitly advises redacting sensitive data and 13-digit Thai citizen IDs', () => {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  assert.match(html, /เลขบัตรประจำตัวประชาชน 13 หลัก/);
  assert.match(html, /ปิดบังข้อมูลส่วนบุคคล/);
  assert.match(html, /privacy-note/);
});

test('ui-contract - Accessibility: dropzone keyboard focus and aria-live dynamic regions', () => {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const jsPath = path.join(PUBLIC_DIR, 'app.js');
  const jsCode = fs.readFileSync(jsPath, 'utf-8');

  // Dropzone keyboard access
  assert.match(html, /id="dropzone"[^>]*tabindex="0"/);
  assert.match(html, /id="dropzone"[^>]*role="button"/);
  assert.match(html, /id="dropzone"[^>]*aria-label=/);

  // Dynamic live regions for screen readers
  assert.match(html, /id="bridgePill"[^>]*aria-live="polite"/);
  assert.match(html, /id="creditBadge"[^>]*aria-live="polite"/);
  assert.match(html, /id="pipelineTracker"[^>]*aria-live="polite"/);
  assert.match(html, /id="toast"[^>]*role="status"[^>]*aria-live="assertive"/);

  // App.js keyboard event listener for Enter/Space
  assert.ok(
    jsCode.includes("dropzone.addEventListener('keydown'") || jsCode.includes('dropzone.addEventListener("keydown"'),
    'app.js must register keydown listener on dropzone for keyboard accessibility'
  );
});
