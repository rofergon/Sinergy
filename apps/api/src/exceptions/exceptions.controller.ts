import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";

@Controller("exceptions")
@UseGuards(DemoAuthGuard, RolesGuard)
export class ExceptionsController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list() {
    return this.domain.listExceptions();
  }

  @Patch(":id/resolve")
  @Roles("admin", "finance_operator", "compliance_reviewer")
  resolve(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.domain.resolveException(user, id);
  }
}

