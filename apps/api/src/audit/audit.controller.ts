import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { DemoAuthGuard } from "../common/auth.js";
import { FundingPersistenceService } from "../funding/funding.persistence.service.js";

@Controller("audit-logs")
@UseGuards(DemoAuthGuard)
export class AuditController {
  constructor(
    private readonly domain: DemoDomainService,
    private readonly fundingPersistence: FundingPersistenceService,
  ) {}

  @Get()
  async list(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string) {
    const [domainAuditLogs, fundingAuditLogs] = await Promise.all([
      Promise.resolve(this.domain.listAuditLogs(entityType, entityId)),
      this.fundingPersistence.listAuditLogs({ entityType, entityId }),
    ]);

    return [...domainAuditLogs, ...fundingAuditLogs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
