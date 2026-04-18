import { Controller, Get, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";

@Controller("compliance")
@UseGuards(DemoAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get("cases")
  @Roles("admin", "compliance_reviewer")
  list() {
    return this.domain.listComplianceCases();
  }
}

