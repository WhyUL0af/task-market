# Task Market MVP

任務發布管理系統 MVP，採用 Next.js + NestJS + Prisma + PostgreSQL + JWT。

## 專案架構

```text
apps/
  api/                 NestJS API
    prisma/schema.prisma
    src/
      auth/            註冊、登入、JWT、角色權限
      tasks/           任務、申請、提交、驗收流程
      prisma/          Prisma service
  web/                 Next.js App Router 前端
    app/
      login/
      register/
      tasks/
      my-tasks/
```

## 啟動方式

1. 安裝依賴

```bash
npm install
```

2. 建立環境變數

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. 啟動 PostgreSQL

```bash
docker compose up -d
```

4. 建立資料表並產生 Prisma Client

```bash
npm run prisma:migrate
```

5. 啟動前後端

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- PostgreSQL: localhost:5433

## 測試 MVP 流程

1. 先建立第一個 Admin：

```bash
$env:ADMIN_EMAIL="admin@yuloaf.work"
$env:ADMIN_PASSWORD="password123"
npm run seed:admin
```

如果從外部 IP 開網站，請確認前後端環境變數有對到：

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://YOUR_PUBLIC_IP:3001/api"

# apps/api/.env
WEB_ORIGINS="http://localhost:3000,http://YOUR_PUBLIC_IP"
```

修改後要重啟 API 和 Web。

2. 到 `/login` 使用 Admin 登入。
3. Admin 到 `/users` 從後台建立或編輯 Employee 帳號。
4. Admin 進入 `/tasks/new` 建立任務，狀態選 `OPEN`。
5. 使用 Employee 登入，進入 `/tasks` 查看任務並申請。
6. 使用 Admin 登入，進入任務詳情審核申請，核准後任務會變成 `IN_PROGRESS`。
7. 使用 Employee 登入，進入 `/my-tasks` 或任務詳情提交成果，狀態會變成 `REVIEW`。
8. 使用 Admin 登入，在任務詳情驗收或退回；驗收後任務變成 `DONE`，退回後變回 `IN_PROGRESS`。

## 權限摘要

- 未登入只能登入。
- 公開註冊已關閉，使用者只能由 Admin 從後台建立。
- `ADMIN` 可以建立、編輯、刪除任務、審核申請、驗收或退回成果。
- `EMPLOYEE` 可以瀏覽開放任務、申請任務、查看自己被指派的任務、提交成果。

## 常用指令

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run seed:admin
```

## 部署

正式網域規劃：

- Web: `https://yuloaf.work`
- API: `https://api.yuloaf.work`

部署與 DNS 設定請看 [DEPLOYMENT.md](./DEPLOYMENT.md)。

如果要部署在自己的電腦並透過 Cloudflare 連進來，請看 [SELF_HOSTING.md](./SELF_HOSTING.md)。
