import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";
import { FundingService } from "./funding.service.js";

@Controller("funding")
@UseGuards(DemoAuthGuard, RolesGuard)
export class FundingController {
  constructor(private readonly funding: FundingService) {}

  @Post("transactions")
  @Roles("admin", "finance_operator")
  record(
    @CurrentUser() user: SessionUser,
    @Body() body: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId?: string },
  ) {
    return this.funding.recordManualFunding(user, body);
  }

  @Post("instructions/:id/rescan")
  @Roles("admin", "finance_operator")
  rescan(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.funding.rescanFundingInstruction(user, id);
  }
}
