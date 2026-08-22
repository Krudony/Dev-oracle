# Lesson Learned: Vite versions and Cloudflare deployments

When deploying React SPA projects to Cloudflare Pages (or using Wrangler), older versions of Vite (like v5.x) will fail with auto-configuration errors. 
**Always use Vite v6.x or v7.x (Avoid v8)** for any React projects that might be deployed to Cloudflare. 
This rule has been permanently added to `GEMINI.md`.
