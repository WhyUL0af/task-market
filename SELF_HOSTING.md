# Self Hosting With Cloudflare

This guide is for hosting the project on your own computer and exposing it through:

- Web: `https://yuloaf.work`
- API: `https://api.yuloaf.work`

## Recommended Option: Cloudflare Tunnel

Cloudflare Tunnel is the easiest and safest option for a home computer:

- No router port forwarding
- No public/static IP required
- HTTPS is handled by Cloudflare
- Your local services can stay on private localhost ports

Local services:

```text
Next.js web: http://localhost:3000
NestJS API:  http://localhost:3001
PostgreSQL:  localhost:5433
```

## 1. Start The App Locally

Install dependencies:

```powershell
npm install
```

Start PostgreSQL:

```powershell
docker compose up -d
```

Run migrations:

```powershell
npm exec -w apps/api -- prisma migrate deploy
```

Create the first Admin account:

```powershell
$env:ADMIN_EMAIL="admin@yuloaf.work"
$env:ADMIN_PASSWORD="change-this-password"
npm run seed:admin
```

Start the web and API:

```powershell
npm run dev
```

For a more production-like local run:

```powershell
npm run build
npm run start -w apps/api
npm run start -w apps/web
```

## 2. Set Local Environment Variables

Backend `apps/api/.env`:

```env
DATABASE_URL="postgresql://task_market:task_market@localhost:5433/task_market?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3001
WEB_ORIGIN="https://yuloaf.work"
```

Frontend `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="https://api.yuloaf.work/api"
```

After changing frontend env vars, restart or rebuild the web app.

## 3. Install Cloudflare Tunnel

Install `cloudflared` on Windows:

```powershell
winget install Cloudflare.cloudflared
```

Log in:

```powershell
cloudflared tunnel login
```

Create a tunnel:

```powershell
cloudflared tunnel create task-market
```

Create DNS routes:

```powershell
cloudflared tunnel route dns task-market yuloaf.work
cloudflared tunnel route dns task-market api.yuloaf.work
```

## 4. Cloudflare Tunnel Config

Create this file:

```text
C:\Users\<your-user>\.cloudflared\config.yml
```

Use this content, replacing the tunnel id and credentials path with the values printed by `cloudflared tunnel create`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\<your-user>\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: yuloaf.work
    service: http://localhost:3000
  - hostname: api.yuloaf.work
    service: http://localhost:3001
  - service: http_status:404
```

Run the tunnel:

```powershell
cloudflared tunnel run task-market
```

Now test:

```text
https://yuloaf.work
https://api.yuloaf.work/api/tasks
```

`https://api.yuloaf.work/api/tasks` should return `401 Unauthorized` when you are not logged in. That means the API is reachable and protected.

## 5. Keep It Running

For real usage, you need three long-running processes:

```text
PostgreSQL container
NestJS API
Next.js web
Cloudflare tunnel
```

The simple development setup is:

```powershell
docker compose up -d
npm run dev
cloudflared tunnel run task-market
```

For production, use a process manager such as PM2 or Windows services so the app starts again after reboot.

## Alternative: Router Port Forwarding

Only use this if you understand router/firewall exposure.

You would need:

- Public IP or dynamic DNS
- Router forwarding `80` and `443` to your computer
- Reverse proxy such as Caddy or Nginx
- Cloudflare DNS records pointing to your public IP

For a home computer, Cloudflare Tunnel is usually the better path.
