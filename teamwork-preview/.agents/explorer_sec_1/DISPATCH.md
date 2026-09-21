# Dispatch: Security Invariants Explorer

Target: Audit security invariants (DNS rebinding guard, no CORS wildcard, privacy consent, redaction warning, no file persistence).
Workspace: /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview
Working directory: /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview/.agents/explorer_sec_1
Original Request: /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview/.agents/ORIGINAL_REQUEST.md

## 2026-09-04T02:38:00Z

You are the Security Invariants Explorer (Reviewer track) for 'รู้ทันหนังสือราชการ (Thai Official Document Explainer)'.
Your working directory is: /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview/.agents/explorer_sec_1/
The workspace directory is: /home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview

MANDATORY FIRST STEP: Read the original user request at:
/home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview/.agents/ORIGINAL_REQUEST.md

Your task as the Security Reviewer/Explorer:
1. Inspect the codebase in `/home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview` for security invariants.
2. Specifically audit these 5 mandatory security invariants:
   a. DNS rebinding guard: Does the server strictly validate Host / Origin headers? Does it prevent DNS rebinding attacks when binding to localhost/loopback?
   b. No CORS wildcard: Is CORS configured without `*` wildcard on sensitive endpoints or file handling? Are headers restricted properly?
   c. Privacy consent: Does the client/server enforce explicit privacy consent before documents/text are submitted for AI processing?
   d. Redaction warning: Does the UI or server provide warnings or detection for sensitive PII (citizen ID, names, addresses, confidential markers) prior to transmission?
   e. No file persistence: Is there absolute zero disk persistence for uploaded documents or attachments? Are buffers kept strictly in memory and cleared?
3. Document any security violations, weaknesses, or areas needing hardening.
4. Propose precise code remedies for any invariant that is missing or incomplete.
5. Write your comprehensive security audit report to:
   `/home/krudony/ghq/github.com/Krudony/dev-oracle/teamwork-preview/.agents/explorer_sec_1/handoff.md`
6. Send a completion message back to the orchestrator (conversation ID: dd885fb3-52e0-436e-9864-3b7668e074aa) using send_message.

