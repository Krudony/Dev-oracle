# Learning: Embedding race condition and Codex config after restart

On 2026-04-26 in Dev Oracle, the first `arra_learn` call after restart wrote its learning file successfully but returned `embedding: failed`. An immediate second `arra_learn` call returned `embedding: ok`. The practical lesson is that a first-call failure after restart should not be treated as proof that `OLLAMA_BASE_URL` or Codex config is wrong. In this case, the stronger explanation was a startup race where LanceDB connection readiness lagged behind the visible restart completion.

Operationally, this means `arra_learn` should be evaluated as a multi-phase operation: write path and embedding path can diverge. Report those phases separately, and if the first post-restart call fails only on embedding, retry once immediately before escalating to config debugging.
