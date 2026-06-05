import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.keyFor(request);
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > MAX_ATTEMPTS) {
      throw new HttpException(
        "Too many login attempts",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private keyFor(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: { email?: string };
  }) {
    const forwardedFor = request.headers?.["x-forwarded-for"];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0] ??
      request.ip ??
      "unknown";
    const email = request.body?.email?.toLowerCase() ?? "unknown";
    return `${ip}:${email}`;
  }
}
