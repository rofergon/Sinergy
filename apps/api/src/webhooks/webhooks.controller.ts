import { Body, Controller, Post } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly domain: DemoDomainService) {}

  @Post("partner")
  partner(@Body() body: { eventId: string; payoutId: string; status: "paid" | "failed" }) {
    return this.domain.recordPartnerWebhook(body);
  }

  @Post("funding")
  funding(@Body() body: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId: string }) {
    return this.domain.recordFundingTransaction(this.domain.getDefaultUser(), body);
  }
}

