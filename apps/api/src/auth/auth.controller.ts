import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Res,
  UseGuards
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto";
import { LoginRateLimitGuard } from "./login-rate-limit.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post("register")
  register(_dto: RegisterDto) {
    throw new ForbiddenException("Public registration is disabled");
  }

  @Post("login")
  @UseGuards(LoginRateLimitGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    const secureCookies = this.config.get<string>("COOKIE_SECURE") === "true";
    response.cookie("access_token", result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    return {
      user: result.user
    };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token", { path: "/" });
    return { ok: true };
  }
}
