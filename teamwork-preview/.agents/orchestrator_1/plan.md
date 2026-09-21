# Orchestration Plan: รู้ทันหนังสือราชการ (Thai Official Document Explainer)

## Overview
Coordinate the engineering team (Implementer, Reviewer, Tester) for "รู้ทันหนังสือราชการ" — a local-first web application powered by a serial multi-role engine on AiPASS Bridge that deciphers complex Thai official documents into plain-Thai explanations, deadlines, and actionable checklists.

## Team Composition & Specialist Roles
1. **Implementer**:
   - Inspect codebase (`server.mjs`, `lib/`, `public/`, etc.).
   - Verify file attachment handling, server endpoints, stream logic, AiPASS Bridge integration.
   - Fix any implementation issues discovered.
2. **Reviewer**:
   - Audit security invariants:
     - DNS rebinding guard
     - No CORS wildcard
     - Privacy consent
     - Redaction warning
     - No file persistence
   - Verify code quality and architecture constraints.
3. **Tester**:
   - Audit and verify unit, integration, and E2E test suites (`node:test`, deterministic mock mode).
   - Verify all tests pass, edge cases are covered, and test suites are robust.
4. **Adversarial Verifier (Challenger)**:
   - Run adversarial testing and edge case verification.
5. **Forensic Auditor (teamwork_preview_auditor)**:
   - Perform integrity audit against cheating, dummy facade implementations, and hardcoded test mocks.

## Execution Phases
- **Phase 1: Survey & Assessment**
  - Spawn 3 Explorers (Explorer 1: Architecture & Implementation; Explorer 2: Security Invariants; Explorer 3: Testing & Mock Suites).
  - Collate findings into `PROJECT.md` and feature/invariants inventory.
- **Phase 2: Remediation & Implementation (if needed)**
  - Spawn Worker to resolve any gaps identified during survey.
- **Phase 3: Formal Review & Security Audit**
  - Spawn Reviewers to evaluate security invariants and implementation soundness.
- **Phase 4: Test Suite Audit & Empirical Verification**
  - Spawn Tester / Challenger to execute test suite and challenge boundary cases.
- **Phase 5: Forensic Integrity Audit**
  - Spawn Forensic Auditor to verify genuine implementation and lack of hardcoding.
- **Phase 6: Synthesis & Reporting**
  - Aggregate reports, compile `GATE_STATUS.md`, write `handoff.md`, and report completion to Sentinel.
