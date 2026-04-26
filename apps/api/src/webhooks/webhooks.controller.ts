import { Body, Controller, Post } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { FundingService } from "../funding/funding.service.js";

@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly domain: DemoDomainService,
    private readonly fundingService: FundingService,
  ) {}

  @Post("partner")
  partner(@Body() body: { eventId: string; payoutId: string; status: "paid" | "failed" }) {
    return this.domain.recordPartnerWebhook(body);
  }

  @Post("funding")
  funding(@Body() body: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId: string }) {
    return this.fundingService.recordManualFunding(this.domain.getDefaultUser(), body, "webhook");
  }
}
