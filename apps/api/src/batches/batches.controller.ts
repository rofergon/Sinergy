import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { CreateBatchDto, ImportBatchDto, SessionUser } from "@latam-payouts/contracts";
import { FundingPersistenceService } from "../funding/funding.persistence.service.js";
import { FundingService } from "../funding/funding.service.js";

@Controller("batches")
@UseGuards(DemoAuthGuard, RolesGuard)
export class BatchesController {
  constructor(
    private readonly domain: DemoDomainService,
    private readonly funding: FundingService,
    private readonly fundingPersistence: FundingPersistenceService,
  ) {}

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
  async getById(@Param("id") id: string) {
    const detail = this.domain.getBatchDetail(id);
    const fundingView = await this.funding.getFundingView(id);
    const persistedAuditTrail = await this.fundingPersistence.listAuditLogs({ entityId: id });

    return {
      ...detail,
      fundingInstruction: fundingView.instruction,
      fundingTransactions: fundingView.transactions,
      auditTrail: [...detail.auditTrail, ...persistedAuditTrail].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    };
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
    return this.funding.ensureFundingInstruction(user, id);
  }

  @Patch("compliance/:caseId/resolve")
  @Roles("admin", "compliance_reviewer")
  resolveCompliance(@CurrentUser() user: SessionUser, @Param("caseId") caseId: string) {
    return this.domain.resolveComplianceCase(user, caseId);
  }
}
