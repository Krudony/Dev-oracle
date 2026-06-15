# Cloudflare Tunnel Networking with Docker in WSL2

When deploying applications in WSL2 and exposing them via Cloudflare Tunnels running in Docker, network isolation can cause persistent 502/1033 connection errors. 

**Key Insights:**
1. **Protocol Mismatch:** Ensure the Cloudflare Zero Trust Dashboard perfectly matches the underlying service protocol. Attempting to route `HTTPS` to a standard `HTTP` PHP development server will result in immediate rejection.
2. **Network Host Mode:** Running the `cloudflared` Docker container with the `--network host` flag allows the tunnel client to directly access ports exposed by other containers on `localhost` (e.g., `localhost:8087`), bypassing complex bridge networking issues in WSL2.
3. **Redundancy Causes Instability:** Never run native binaries (like `cloudflared.deb`) concurrently with Dockerized versions of the same service. This leads to unpredictable traffic routing and port conflicts. Always enforce a single source of truth for infrastructure orchestration.