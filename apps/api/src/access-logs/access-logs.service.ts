import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AccessLogUser = {
  id: string;
  email: string;
  role: string;
};

export type CreateAccessLogInput = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  user?: AccessLogUser | null;
};

@Injectable()
export class AccessLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAccessLogInput) {
    await this.prisma.$executeRaw`
      INSERT INTO "AccessLog" (
        "id",
        "method",
        "path",
        "statusCode",
        "durationMs",
        "ip",
        "userAgent",
        "referer",
        "userId",
        "userEmail",
        "userRole"
      )
      VALUES (
        ${this.cuid()},
        ${input.method},
        ${input.path},
        ${input.statusCode},
        ${input.durationMs},
        ${input.ip ?? null},
        ${input.userAgent ?? null},
        ${input.referer ?? null},
        ${input.user?.id ?? null},
        ${input.user?.email ?? null},
        ${input.user?.role ?? null}
      )
    `;
  }

  async list(limit = 100) {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    return this.prisma.$queryRaw`
      SELECT
        "id",
        "createdAt",
        "method",
        "path",
        "statusCode",
        "durationMs",
        "ip",
        "userAgent",
        "referer",
        "userId",
        "userEmail",
        "userRole"
      FROM "AccessLog"
      WHERE "path" NOT LIKE '/api/dev/access-logs%'
      ORDER BY "createdAt" DESC
      LIMIT ${safeLimit}
    `;
  }

  async summary() {
    const [total, uniqueIps, authenticatedUsers] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "AccessLog"
        WHERE "path" NOT LIKE '/api/dev/access-logs%'
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "ip")::bigint AS count
        FROM "AccessLog"
        WHERE "ip" IS NOT NULL
        AND "path" NOT LIKE '/api/dev/access-logs%'
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "userId")::bigint AS count
        FROM "AccessLog"
        WHERE "userId" IS NOT NULL
        AND "path" NOT LIKE '/api/dev/access-logs%'
      `
    ]);

    return {
      total: Number(total[0]?.count ?? 0),
      uniqueIps: Number(uniqueIps[0]?.count ?? 0),
      authenticatedUsers: Number(authenticatedUsers[0]?.count ?? 0)
    };
  }

  private cuid() {
    return `clog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
