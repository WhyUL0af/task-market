import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AccessLogMiddleware } from "./access-log.middleware";
import { AccessLogsController } from "./access-logs.controller";
import { AccessLogsService } from "./access-logs.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>("JWT_SECRET") ??
          (config.get<string>("NODE_ENV") === "production" ? undefined : "dev-secret")
      })
    })
  ],
  controllers: [AccessLogsController],
  providers: [AccessLogsService, AccessLogMiddleware]
})
export class AccessLogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogMiddleware).forRoutes("*");
  }
}
