import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType
} from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto
} from "./dto";
import { UsersService } from "./users.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("ADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get("leaderboard")
  @Roles("ADMIN", "EMPLOYEE")
  leaderboard() {
    return this.users.leaderboard();
  }

  @Get("me")
  @Roles("ADMIN", "EMPLOYEE")
  me(@CurrentUser() user: CurrentUserType) {
    return this.users.me(user);
  }

  @Patch("me")
  @Roles("ADMIN", "EMPLOYEE")
  updateMe(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user, dto);
  }

  @Get("profile-tags")
  @Roles("ADMIN", "EMPLOYEE")
  profileTags() {
    return this.users.profileTags();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: CurrentUserType) {
    return this.users.delete(id, user);
  }
}
