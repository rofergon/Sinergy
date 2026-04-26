import { Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AuthController } from "./auth/auth.controller.js";
import { CompaniesController } from "./companies/companies.controller.js";
import { BeneficiariesController } from "./beneficiaries/beneficiaries.controller.js";
import { CorridorsController } from "./corridors/corridors.controller.js";
import { BatchesController } from "./batches/batches.controller.js";
import { FundingController } from "./funding/funding.controller.js";
import { PayoutsController } from "./payouts/payouts.controller.js";
import { ExceptionsController } from "./exceptions/exceptions.controller.js";
import { ReportsController } from "./reports/reports.controller.js";
import { AuditController } from "./audit/audit.controller.js";
import { WebhooksController } from "./webhooks/webhooks.controller.js";
import { DemoDomainService } from "./demo/demo-domain.service.js";
import { DemoAuthGuard, RolesGuard } from "./common/auth.js";
import { ComplianceController } from "./compliance/compliance.controller.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { FundingPersistenceService } from "./funding/funding.persistence.service.js";
import { MemoryFundingPersistenceService } from "./funding/memory-funding.persistence.service.js";
import { SolanaFundingGateway } from "./funding/solana-funding.gateway.js";
import { FundingService } from "./funding/funding.service.js";

const useMemoryFundingPersistence = process.env.FUNDING_PERSISTENCE_MODE === "memory";

@Module({
  imports: [],
  controllers: [
    AuthController,
    CompaniesController,
    BeneficiariesController,
    CorridorsController,
    BatchesController,
    FundingController,
    PayoutsController,
    ExceptionsController,
    ComplianceController,
    ReportsController,
    AuditController,
    WebhooksController,
  ],
  providers: [
    DemoDomainService,
    PrismaService,
    useMemoryFundingPersistence
      ? {
          provide: FundingPersistenceService,
          useClass: MemoryFundingPersistenceService,
        }
      : FundingPersistenceService,
    SolanaFundingGateway,
    FundingService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: DemoAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
