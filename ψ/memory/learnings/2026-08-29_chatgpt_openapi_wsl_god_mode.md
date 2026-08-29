# ChatGPT OpenAPI Bridging and WSL Context Awareness

**Date**: 2026-08-29
**Source**: rrr: REPO

## Context
Evolving a local FastMCP server into a "God Mode" bridge for ChatGPT Web Custom Actions.

## The Lesson
1. **ChatGPT vs MCP**: ChatGPT Custom Actions strictly require OpenAPI (REST) schemas and do not natively speak the Model Context Protocol (JSON-RPC over SSE). A "Bridge" must wrap MCP tools in a REST API framework like FastAPI.
2. **WSL as a Vector**: When an AI agent runs inside Windows Subsystem for Linux (WSL), it has native, often unauthenticated access to the host Windows filesystem via `/mnt/c/`. This allows bridging capabilities directly to the user's GUI environment (e.g., Desktop).
3. **God Mode Risks**: Exposing `subprocess.run(..., shell=True)` via an OpenAPI schema turns any connected LLM into a remote execution environment. This "Codex" capability is immensely powerful but bypasses standard security sandboxes, requiring explicit user warnings, especially when using ChatGPT's "Always Allow" action policies.
