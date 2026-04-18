import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { DemoAuthGuard } from "../common/auth.js";

@Controller("audit-logs")
@UseGuards(DemoAuthGuard)
export class AuditController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string) {
    return this.domain.listAuditLogs(entityType, entityId);
  }
}

