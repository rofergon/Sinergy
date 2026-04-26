import { Controller, Get, NotFoundException, Param, Patch, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { CurrentUser, DemoAuthGuard, Roles, RolesGuard } from "../common/auth.js";
import type { SessionUser } from "@latam-payouts/contracts";
import { FundingPersistenceService } from "../funding/funding.persistence.service.js";

@Controller("exceptions")
@UseGuards(DemoAuthGuard, RolesGuard)
export class ExceptionsController {
  constructor(
    private readonly domain: DemoDomainService,
    private readonly fundingPersistence: FundingPersistenceService,
  ) {}

  @Get()
  async list() {
    const [domainExceptions, fundingExceptions] = await Promise.all([
      Promise.resolve(this.domain.listExceptions()),
      this.fundingPersistence.listExceptions(),
    ]);

    return [...domainExceptions, ...fundingExceptions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  @Patch(":id/resolve")
  @Roles("admin", "finance_operator", "compliance_reviewer")
  async resolve(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    if (this.domain.listExceptions().some((entry) => entry.id === id)) {
      return this.domain.resolveException(user, id);
    }

    const exception = await this.fundingPersistence.resolveException(id);
    if (!exception) {
      throw new NotFoundException(`Exception ${id} not found.`);
    }
    return exception;
  }
}
