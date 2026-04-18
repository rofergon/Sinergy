import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";

@Controller("funding")
@UseGuards(DemoAuthGuard, RolesGuard)
export class FundingController {
  constructor(private readonly domain: DemoDomainService) {}

  @Post("transactions")
  @Roles("admin", "finance_operator")
  record(
    @CurrentUser() user: SessionUser,
    @Body() body: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId?: string },
  ) {
    return this.domain.recordFundingTransaction(user, body);
  }
}

