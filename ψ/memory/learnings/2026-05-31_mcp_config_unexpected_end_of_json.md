# Learning: Strict JSON Parsing of 0-Byte Config Files in Antigravity CLI

**Date**: 2026-05-31
**Author**: Dev Oracle
**Context**: Debugging MCP connection errors in Antigravity/Gemini CLI

## Discovered Pattern
In the `antigravity-cli` implementation (specifically `discovery.go:383` or similar parser mechanisms), there is a strict configuration loader. When the CLI reads `~/.gemini/config/mcp_config.json`, if the file is present but contains exactly **0 bytes** (a completely blank file), the JSON parser throws a critical error:

```
Failed to load JSON config file /home/krudony/.gemini/config/mcp_config.json: unexpected end of JSON input
```

This error does not just skip the empty file; it completely halts the discovery loop for all Model Context Protocol (MCP) integrations. As a result, other configuration files (like `settings.json` or `config.toml` where servers like `arra-oracle-v3` are defined) are never merged or active, leaving the workspace without any MCP capability.

## Technical Details & Diagnostics
1. **Symptom**: CLI runs but any MCP-related tool calls are completely unavailable or error out.
2. **Root Cause**: An unhandled empty stream or string sent directly to standard JSON decoder (`json.Unmarshal` or similar in Go).
3. **Detection**: Run `tail -n 100 ~/.gemini/antigravity-cli/cli.log` and search for:
   `discovery.go:383` or `mcp_config.json: unexpected end of JSON input`.

## Mitigation & Prevention
To bypass this parsing bottleneck and restore full MCP capabilities across other configs:

1. **Write Valid JSON**: Never leave configuration files blank. Write at least an empty object `{}` inside `~/.gemini/config/mcp_config.json` to satisfy the parser.
   ```bash
   echo "{}" > ~/.gemini/config/mcp_config.json
   ```
2. **Graceful Degradation (Proposed CLI Patch)**: Modify the CLI's config loader to check if the file size is 0 bytes or if the read string is empty, and fallback to an empty config map instead of propagating the error.

## Tags
`#mcp` `#configuration` `#antigravity-cli` `#debugging` `#lancedb` `#ollama`
