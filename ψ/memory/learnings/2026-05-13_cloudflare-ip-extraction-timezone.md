# Learning: Real IP Extraction and Timezone Management behind Cloudflare

## Context
When running a web application (e.g., PHP) behind a Cloudflare Tunnel and inside Docker, the backend often sees the Docker gateway IP (`172.17.0.1`) as the source of all requests. This breaks security logging, IP-based rate limiting, and suspicious activity detection.

## Problem
1. `REMOTE_ADDR` captures the immediate proxy (Docker Gateway), not the client.
2. Default timezones (UTC) in containerized environments cause logs to be out of sync with the user's local context (e.g., GMT+7).
3. "New IP" detection logic can be buggy if it only checks for recent absence rather than the true first occurrence.

## Solution
### 1. Real IP Header
Always check Cloudflare-specific headers before falling back to standard ones. In PHP:
```php
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
   ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
   ?? $_SERVER['REMOTE_ADDR'];
```

### 2. Timezone Management
Set the timezone explicitly in the application bootstrap to ensure consistency across the environment:
```php
date_default_timezone_set('Asia/Bangkok');
```
When logging to SQLite, prefer passing the formatted date from PHP instead of relying on `DEFAULT CURRENT_TIMESTAMP` if the database engine's timezone is not easily configurable.

### 3. Robust First-Seen Logic
To detect a truly new IP (and avoid duplicate alerts), query the minimum timestamp for an IP:
```sql
SELECT ip_address 
FROM login_logs 
GROUP BY ip_address 
HAVING MIN(created_at) >= datetime('now', '-10 minutes')
```

## Pattern
When containerizing legacy or standalone web systems:
- Consolidate external dependencies (like Tunnels) to avoid duplicate service conflicts.
- Mirror environment settings (Port, Volumes, Timezone) across all services in the fleet for easier orchestration.
