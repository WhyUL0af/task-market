import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TasksModule } from "./tasks/tasks.module";
import { UsersModule } from "./users/users.module";
import { GamificationModule } from "./gamification/gamification.module";
import { AccessLogsModule } from "./access-logs/access-logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccessLogsModule,
    GamificationModule,
    TasksModule,
    UsersModule
  ]
})
export class AppModule {}
