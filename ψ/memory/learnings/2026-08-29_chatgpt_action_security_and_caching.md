# ChatGPT Custom Action Security Policies and Token Portability

**Date**: 2026-08-29
**Source**: rrr: REPO

## Context
Deploying a permanent Cloudflare Named Tunnel for a ChatGPT Custom Action bridge and dealing with execution permission prompts.

## The Lesson
1. **Cloudflare Token Portability**: Cloudflare tunnel tokens (`cloudflared tunnel run --token <TOKEN>`) are architecture-agnostic. If a user struggles to run `cloudflared` on their host OS (e.g., Windows executable mismatch), the agent can intercept the token and run the tunnel directly from the WSL workspace.
2. **Action Caching**: When updating a Custom GPT action's schema URL, simply editing the URL often fails due to aggressive caching. The user must delete the old action, re-import the new schema, save the GPT, and initiate a completely **New Chat** to force the new routing.
3. **Missing "Always Allow" Button**: OpenAI dynamically hides the "Always Allow" button in the Custom Action permission popup if the endpoint lacks strict authentication (like OAuth or an API Key) and/or executes dangerous operations. This forces manual confirmation (Allow/Deny) for every execution to prevent silent malicious activity. To restore the "Always Allow" UX, the bridge must implement formal API Key authentication.
