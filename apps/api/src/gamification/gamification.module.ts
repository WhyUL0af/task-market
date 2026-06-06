import { Module } from "@nestjs/common";
import { GamificationController } from "./gamification.controller";
import { GamificationService } from "./gamification.service";
import { LeaderboardController } from "./leaderboard.controller";

@Module({
  controllers: [GamificationController, LeaderboardController],
  providers: [GamificationService],
  exports: [GamificationService]
})
export class GamificationModule {}
