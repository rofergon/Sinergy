import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { CreateBeneficiaryDto, SessionUser } from "@latam-payouts/contracts";

@Controller("beneficiaries")
@UseGuards(DemoAuthGuard, RolesGuard)
export class BeneficiariesController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list() {
    return this.domain.listBeneficiaries();
  }

  @Post()
  @Roles("admin", "finance_operator")
  create(@CurrentUser() user: SessionUser, @Body() body: CreateBeneficiaryDto) {
    return this.domain.createBeneficiary(user, body);
  }

  @Patch(":id")
  @Roles("admin", "finance_operator")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: Partial<CreateBeneficiaryDto>) {
    return this.domain.updateBeneficiary(user, id, body);
  }
}

