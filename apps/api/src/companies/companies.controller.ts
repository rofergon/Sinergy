import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { Company, SessionUser } from "@latam-payouts/contracts";

@Controller("companies")
@UseGuards(DemoAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get("current")
  getCurrent() {
    return this.domain.getCompany();
  }

  @Patch("current")
  @Roles("admin", "finance_operator")
  updateCurrent(@CurrentUser() user: SessionUser, @Body() body: Partial<Company>) {
    return this.domain.updateCompany(user, body);
  }
}

