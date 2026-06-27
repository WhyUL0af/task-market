CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");
CREATE INDEX "AccessLog_ip_idx" ON "AccessLog"("ip");
