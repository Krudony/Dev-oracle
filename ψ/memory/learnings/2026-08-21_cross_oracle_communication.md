# Cross-Oracle Communication Protocol and Bun Dependency Management

**Date**: 2026-08-21
**Source**: Dev-oracle Maintenance Session

### The Oracle Threads Protocol
For cross-agent communication within the Oracle fleet, it is mandatory to follow the strict 3-step loop:
1. **Send**: Use `maw talk-to <agent-name> "message..."` to ensure the thread is recorded persistently in the Oracle ledger. Never use `tmux send-keys`.
2. **Nudge**: Use `maw hey <agent-name> "check thread #N"` (or `--force` if the pane is busy) to alert the target agent.
3. **Verify**: Use `maw peek <agent-name>` immediately to confirm the message was received and the target agent is processing it.

### Fleet Dependency Updates
When pulling large sweeping updates across multiple Oracle repos (like `maw-js`, `arra-oracle`, `oracle-skills-cli`), standard `npm install` may encounter lockfile conflicts or cache errors. Prioritize `bun install` (after removing `node_modules` and `package-lock.json`) for faster, more resilient dependency resolution.
