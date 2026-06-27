import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AccessLogsService } from "./access-logs.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("ADMIN")
@Controller("dev/access-logs")
export class AccessLogsController {
  constructor(private readonly logs: AccessLogsService) {}

  @Get()
  async list(@Query("limit") limit?: string) {
    const rows = await this.logs.list(limit ? Number(limit) : 100);
    const summary = await this.logs.summary();

    return {
      summary,
      rows
    };
  }
}
