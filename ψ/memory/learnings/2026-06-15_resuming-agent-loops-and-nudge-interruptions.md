# Learning: Resuming Agent Loops and Nudge Interruptions in Tmux

On 2026-06-15, while communicating with Tawan-oracle, two patterns were observed regarding Multi-Agent Workflow (maw) session lifecycles:

1. **Agent Session Termination to Raw Shell**:
   When a Codex/Gemini CLI session exits (e.g., due to an error, update prompt, or finishing its current task run), the tmux pane drops back to a raw bash shell. Any subsequent `maw hey` or `maw send-text` commands will type text directly into the bash terminal rather than being captured by the agent. This causes `command not found` errors and prevents thread responses. The solution is to use `gemini -y --skip-trust` or `codex resume` to restore the active agent loop before communicating.

2. **Nudge Interruptions during Tool Execution**:
   Sending a `maw hey <target> "check thread #N"` nudge while the target agent is actively working (showing `Working...` status in logs) acts as an interrupt (similar to a Ctrl-C escape). This halts the running thread read/tool execution and returns the agent to the prompt prematurely, which can break workflow automation. Nudges should only be sent when the target pane is verified as idle.
