import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { AccessLogsService, AccessLogUser } from "./access-logs.service";

function getClientIp(request: Request) {
  const cfIp = request.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.ip ?? request.socket.remoteAddress ?? null;
}

@Injectable()
export class AccessLogMiddleware implements NestMiddleware {
  constructor(
    private readonly logs: AccessLogsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  use(request: Request, response: Response, next: NextFunction) {
    if (request.method === "OPTIONS" || request.originalUrl.startsWith("/api/dev/access-logs")) {
      return next();
    }

    const startedAt = Date.now();

    response.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const user = this.userFromRequest(request);

      void this.logs
        .create({
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs,
          ip: getClientIp(request),
          userAgent: request.get("user-agent"),
          referer: request.get("referer"),
          user
        })
        .catch(() => undefined);
    });

    return next();
  }

  private userFromRequest(request: Request): AccessLogUser | null {
    const token = this.tokenFromRequest(request);
    if (!token) {
      return null;
    }

    try {
      const payload = this.jwt.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        secret:
          this.config.get<string>("JWT_SECRET") ??
          (this.config.get<string>("NODE_ENV") === "production" ? undefined : "dev-secret")
      });

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role
      };
    } catch {
      return null;
    }
  }

  private tokenFromRequest(request: Request) {
    const authHeader = request.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length);
    }

    return request.cookies?.access_token ?? null;
  }
}
