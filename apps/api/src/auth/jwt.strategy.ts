import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

function extractJwtFromCookie(request: { cookies?: Record<string, string> }) {
  return request.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>("JWT_SECRET") ??
      (config.get<string>("NODE_ENV") === "production" ? undefined : "dev-secret");
    if (!secret) {
      throw new Error("JWT_SECRET must be set");
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: false,
      secretOrKey: secret
    });
  }

  validate(payload: { sub: string; email: string; role: "ADMIN" | "EMPLOYEE" }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }
}
