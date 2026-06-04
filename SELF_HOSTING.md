# Self Hosting With Cloudflare

This guide is for hosting the project on your own computer and exposing it through:

- Web: `https://taskmarket.yuloaf.work`
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
WEB_ORIGIN="https://taskmarket.yuloaf.work"
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
  - hostname: taskmarket.yuloaf.work
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
https://taskmarket.yuloaf.work
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

## Alternative: Router Port Forwarding With Caddy

Use this if you want to expose the site from your own router instead of Cloudflare Tunnel.

Do not expose these ports publicly:

```text
3000  Next.js
3001  NestJS API
5433  PostgreSQL
```

Only expose:

```text
80    HTTP
443   HTTPS
```

Recommended local flow:

```text
Internet
  -> Cloudflare DNS
  -> Your home public IP
  -> Router port forwarding 80/443
  -> Your computer
  -> Caddy reverse proxy
  -> localhost:3000 / localhost:3001
```

### 1. Give Your Computer A Fixed LAN IP

In your router DHCP settings, reserve a fixed local IP for your computer, for example:

```text
192.168.1.50
```

The exact IP depends on your router network.

### 2. Router Port Forwarding

Forward these ports to your computer:

```text
External TCP 80  -> 192.168.1.50 TCP 80
External TCP 443 -> 192.168.1.50 TCP 443
```

Do not forward PostgreSQL or app ports.

### 3. Windows Firewall

Allow inbound TCP ports:

```text
80
443
```

### 4. Cloudflare DNS

Find your public IP by visiting:

```text
https://1.1.1.1/help
```

Then create DNS records in Cloudflare:

```text
Type  Name  Value
A     @     YOUR_PUBLIC_IP
A     api   YOUR_PUBLIC_IP
CNAME www   yuloaf.work
```

Start with DNS only, which is the gray cloud, until HTTPS works. After that, you may turn on the orange cloud proxy.

Cloudflare SSL/TLS mode:

```text
Full (strict)
```

### 5. Install Caddy

Install Caddy on Windows:

```powershell
winget install CaddyServer.Caddy
```

Create a file named `Caddyfile`, for example:

```text
C:\me\Projects\task-market\Caddyfile
```

Use this content:

```caddyfile
taskmarket.yuloaf.work {
  reverse_proxy localhost:3000
}

api.yuloaf.work {
  reverse_proxy localhost:3001
}
```

Run Caddy:

```powershell
cd C:\me\Projects\task-market
caddy run
```

### 6. Start The App

Terminal 1:

```powershell
cd C:\me\Projects\task-market
docker compose up -d
npm run start -w apps/api
```

Terminal 2:

```powershell
cd C:\me\Projects\task-market
npm run start -w apps/web
```

Terminal 3:

```powershell
cd C:\me\Projects\task-market
caddy run
```

### 7. Test

Open:

```text
https://taskmarket.yuloaf.work
https://api.yuloaf.work/api/tasks
```

The API URL should return `401 Unauthorized` when you are not logged in.

### Notes

- If your home ISP uses CGNAT, router port forwarding will not work. In that case, use Cloudflare Tunnel instead.
- If your public IP changes often, update the Cloudflare DNS records whenever it changes, or install a dynamic DNS updater.
- Keep PostgreSQL private. Never expose port `5433` to the internet.
- Keep Windows and Node dependencies updated.

For most home networks, Cloudflare Tunnel is still safer and easier, but router port forwarding works if your ISP gives you a real public IP.
