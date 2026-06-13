import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsOptional, IsString } from "class-validator";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType
} from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { GamificationService } from "./gamification.service";

export class EquipBadgeDto {
  @IsString()
  @IsOptional()
  badgeId!: string | null;
}

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("gamification")
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Post("equip-badge")
  @Roles("ADMIN", "EMPLOYEE")
  equipBadge(
    @CurrentUser() user: CurrentUserType,
    @Body() body: EquipBadgeDto
  ) {
    return this.gamification.equipBadge(user.id, body.badgeId);
  }

  @Get("profile/:employeeId")
  @Roles("ADMIN", "EMPLOYEE")
  profile(@Param("employeeId") employeeId: string) {
    return this.gamification.profile(employeeId);
  }

  @Get("badges")
  @Roles("ADMIN", "EMPLOYEE")
  badges() {
    return this.gamification.badges();
  }

  @Get("challenges/weekly")
  @Roles("ADMIN", "EMPLOYEE")
  weekly(@CurrentUser() user: CurrentUserType) {
    return this.gamification.weeklyChallenges(user.id);
  }
}
