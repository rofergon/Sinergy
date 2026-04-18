import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { CreateBatchDto, ImportBatchDto, SessionUser } from "@latam-payouts/contracts";

@Controller("batches")
@UseGuards(DemoAuthGuard, RolesGuard)
export class BatchesController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list() {
    return this.domain.listBatches();
  }

  @Post()
  @Roles("admin", "finance_operator")
  create(@CurrentUser() user: SessionUser, @Body() body: CreateBatchDto) {
    return this.domain.createBatch(user, body);
  }

  @Post("import")
  @Roles("admin", "finance_operator")
  import(@CurrentUser() user: SessionUser, @Body() body: ImportBatchDto) {
    return this.domain.importBatch(user, body);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.domain.getBatchDetail(id);
  }

  @Post(":id/quote")
  @Roles("admin", "finance_operator")
  quote(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.domain.createQuote(user, id);
  }

  @Post(":id/approve")
  @Roles("admin", "approver")
  approve(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: { comment?: string }) {
    return this.domain.approveBatch(user, id, "approved", body.comment);
  }

  @Post(":id/reject")
  @Roles("admin", "approver")
  reject(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: { comment?: string }) {
    return this.domain.approveBatch(user, id, "rejected", body.comment);
  }

  @Get(":id/funding-instructions")
  @Roles("admin", "finance_operator", "approver")
  fundingInstructions(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.domain.getFundingInstruction(user, id);
  }

  @Patch("compliance/:caseId/resolve")
  @Roles("admin", "compliance_reviewer")
  resolveCompliance(@CurrentUser() user: SessionUser, @Param("caseId") caseId: string) {
    return this.domain.resolveComplianceCase(user, caseId);
  }
}

