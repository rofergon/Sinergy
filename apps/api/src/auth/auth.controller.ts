import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";

@Controller()
export class AuthController {
  constructor(private readonly domain: DemoDomainService) {}

  @Post("auth/login")
  login(@Body() body: { email: string; password: string }) {
    return this.domain.login(body.email, body.password);
  }

  @Post("auth/refresh")
  refresh(@Body() body: { refreshToken: string }) {
    return this.domain.refresh(body.refreshToken);
  }

  @Get("me")
  @UseGuards(DemoAuthGuard)
  me(@CurrentUser() user: SessionUser) {
    return user;
  }
}

