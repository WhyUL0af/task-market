import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requireProductionSecret(config: ConfigService) {
  const nodeEnv = config.get<string>("NODE_ENV");
  const jwtSecret = config.get<string>("JWT_SECRET");
  if (nodeEnv === "production" && (!jwtSecret || jwtSecret === "dev-secret")) {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }
}

function originGuard(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);
  return (request: Request, response: Response, next: NextFunction) => {
    if (!unsafeMethods.has(request.method)) {
      return next();
    }

    const origin = request.headers.origin;
    if (!origin || allowed.has(origin)) {
      return next();
    }

    return response.status(403).json({
      message: "Origin is not allowed"
    });
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  requireProductionSecret(config);
  const webOrigins = (
    config.get<string>("WEB_ORIGINS") ??
    config.get<string>("WEB_ORIGIN") ??
    "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: webOrigins,
    credentials: true
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(cookieParser());
  app.use(originGuard(webOrigins));
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      whitelist: true,
      transform: true
    })
  );

  await app.listen(config.get<number>("PORT") ?? 3001);
}

void bootstrap();
