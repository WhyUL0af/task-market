import { Module } from "@nestjs/common";
import { GamificationModule } from "../gamification/gamification.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [GamificationModule],
  controllers: [TasksController],
  providers: [TasksService]
})
export class TasksModule {}
