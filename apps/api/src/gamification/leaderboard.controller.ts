import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { GamificationService } from "./gamification.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("ADMIN", "EMPLOYEE")
@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly gamification: GamificationService) {}

  @Get("monthly-exp")
  monthlyExp() {
    return this.gamification.monthlyExpLeaderboard();
  }

  @Get("completed-tasks")
  completedTasks() {
    return this.gamification.completionLeaderboard();
  }

  @Get("roles/:roleName")
  roles(@Param("roleName") roleName: string) {
    return this.gamification.roleLeaderboard(roleName);
  }

  @Get("on-time-rate")
  onTimeRate() {
    return this.gamification.onTimeLeaderboard();
  }

  @Get("collaboration")
  collaboration() {
    return this.gamification.collaborationLeaderboard();
  }
}
