import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";

@Controller("payouts")
@UseGuards(DemoAuthGuard, RolesGuard)
export class PayoutsController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list() {
    return this.domain.listPayouts();
  }

  @Post(":id/dispatch")
  @Roles("admin", "finance_operator")
  dispatch(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.domain.dispatchPayout(user, id);
  }
}

