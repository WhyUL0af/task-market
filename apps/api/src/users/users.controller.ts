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
import { CreateUserDto, UpdateUserDto } from "./dto";
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
