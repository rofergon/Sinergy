import { Controller, Get, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { DemoAuthGuard } from "../common/auth.js";

@Controller("reports")
@UseGuards(DemoAuthGuard)
export class ReportsController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get("batches")
  getBatchesReport() {
    return this.domain.getBatchReports();
  }
}

