# Deployment Guide

Production domain plan:

- Web: `https://yuloaf.work`
- API: `https://api.yuloaf.work`
- Database: managed PostgreSQL, such as Supabase, Neon, Railway, Render, or a VPS PostgreSQL instance

## Recommended MVP Hosting

The simplest split for this project:

- `apps/web`: Vercel
- `apps/api`: Railway, Render, Fly.io, or a VPS
- PostgreSQL: Supabase, Neon, Railway, or Render PostgreSQL

## DNS Settings

Configure these records at your domain provider:

```text
Type   Name   Value
CNAME  www    frontend-host-value
A/CNAME @     frontend-host-value
CNAME  api    backend-host-value
```

The exact `Value` depends on the hosting provider. Vercel, Render, Railway, and Fly.io will show the DNS target after you add the domain in their dashboard.

## Frontend Environment

Set this in the frontend hosting provider:

```env
NEXT_PUBLIC_API_URL="https://api.yuloaf.work/api"
```

Build command:

```bash
npm run build -w apps/web
```

Output app directory:

```text
apps/web
```

## Backend Environment

Set these in the backend hosting provider:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="replace-with-a-long-random-production-secret"
PORT=3001
WEB_ORIGIN="https://yuloaf.work"
```

Build command:

```bash
npm run build -w apps/api
```

Start command:

```bash
npm run start -w apps/api
```

## Database Migration

After setting `DATABASE_URL` to the production database, run:

```bash
npm exec -w apps/api -- prisma migrate deploy
```

For local development only, use:

```bash
npm run prisma:migrate
```

## Production Checklist

- Point `yuloaf.work` to the frontend host.
- Point `api.yuloaf.work` to the backend host.
- Set `NEXT_PUBLIC_API_URL` on the frontend.
- Set `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `WEB_ORIGIN` on the backend.
- Run Prisma migration against the production database.
- Confirm `https://api.yuloaf.work/api/auth/login` is reachable by the frontend.
- Create the first Admin account with `npm run seed:admin`.

## Account Creation

Public registration is disabled. Accounts must be created by an Admin from the back office.

Create the first Admin account with:

```bash
ADMIN_EMAIL=admin@yuloaf.work ADMIN_PASSWORD=replace-this npm run seed:admin
```

After that, log in as Admin and create Employee accounts from `/register`.
