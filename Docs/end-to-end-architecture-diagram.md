# End-to-End Architecture Diagram

This document explains how the main modules interact across the current MVP and how the architecture is structured today.

## 1. High-Level Architecture

```mermaid
flowchart LR
    U[Finance / Approver / Compliance User]

    subgraph FE[Frontend]
        W["React Operations Console<br/>apps/web"]
        APIClient["API Client<br/>src/lib/api.ts"]
        Routes["Pages and Routing<br/>App.tsx"]
    end

    subgraph Shared[Shared Contracts]
        C["Domain Types / DTOs / Enums<br/>packages/contracts"]
    end

    subgraph BE[Backend]
        N["NestJS API<br/>apps/api"]
        Auth[Demo Auth + Roles Guards]
        Ctrl["Controllers<br/>company, beneficiaries, batches,<br/>funding, payouts, exceptions,<br/>compliance, reports, audit"]
        Domain["DemoDomainService<br/>in-memory business flow"]
    end

    subgraph Data[Persistence Layer]
        Prisma["Prisma Schema<br/>apps/api/prisma/schema.prisma"]
        PG[(PostgreSQL)]
        PGState[Planned only; not active at runtime]
    end

    subgraph External[External Rails / Integrations]
        Solana["USDC on Solana<br/>mocked funding flow"]
        Partners["Bank / payout partners<br/>mocked dispatch flow"]
        Webhooks[Funding and partner webhooks]
    end

    U --> W
    W --> Routes
    Routes --> APIClient
    APIClient --> N
    W -. shared types .-> C
    N -. shared types .-> C
    N --> Auth
    N --> Ctrl
    Ctrl --> Domain
    Domain -. target persistence model .-> Prisma
    Prisma -. future runtime connection .-> PG
    PG --> PGState
    Domain --> Solana
    Domain --> Partners
    Webhooks --> N
```

## 2. Main Module Responsibilities

- `apps/web`: user-facing operations console for the payout workflow
- `packages/contracts`: shared contract layer between frontend and backend
- `apps/api`: HTTP API, guards, controllers, and business orchestration
- `DemoDomainService`: current source of truth for the MVP flow, using in-memory state
- `Prisma schema`: target database model for the next phase
- `PostgreSQL`: planned persistence layer, not yet active in the runtime flow
- `webhooks + partner mocks`: simulate external funding and payout events

## 3. Current Runtime Reality

Today, the real runtime path is:

`React UI -> API client -> NestJS controllers -> DemoDomainService -> in-memory state`

The database layer is modeled, but it is not yet the active source of truth.

## 4. End-to-End Operational Flow

```mermaid
sequenceDiagram
    participant User as Finance / Approver / Compliance User
    participant Web as React Operations Console
    participant Api as NestJS API
    participant Domain as DemoDomainService
    participant Funding as Funding Rail Mock
    participant Partner as Payout Partner Mock

    User->>Web: Sign in with demo credentials
    Web->>Api: POST /auth/login
    Api->>Domain: login(email, password)
    Domain-->>Api: accessToken + refreshToken + user
    Api-->>Web: session payload

    User->>Web: Load workspace
    Web->>Api: bootstrap requests
    Api->>Domain: fetch company, corridors, beneficiaries, batches, payouts, exceptions, reports
    Domain-->>Api: aggregated demo data
    Api-->>Web: initial operational state

    User->>Web: Create beneficiary
    Web->>Api: POST /beneficiaries
    Api->>Domain: createBeneficiary()
    Domain-->>Api: beneficiary + validation status
    Api-->>Web: updated beneficiary list

    User->>Web: Create or import batch
    Web->>Api: POST /batches or POST /batches/import
    Api->>Domain: createBatch() / importBatch()
    Domain-->>Api: batch detail
    Api-->>Web: batch detail view

    User->>Web: Generate quote
    Web->>Api: POST /batches/:id/quote
    Api->>Domain: createQuote()
    Domain-->>Api: quote + updated batch status
    Api-->>Web: quote and totals

    User->>Web: Approve batch
    Web->>Api: POST /batches/:id/approve
    Api->>Domain: approveBatch()
    Domain-->>Api: approval decision + updated statuses
    Api-->>Web: approved batch

    User->>Web: Generate funding instructions
    Web->>Api: GET /batches/:id/funding-instructions
    Api->>Domain: getFundingInstruction()
    Domain-->>Api: wallet, memo, expected amount
    Api-->>Web: funding instructions

    User->>Web: Register funding
    Web->>Api: POST /funding/transactions
    Api->>Domain: recordFundingTransaction()
    Domain->>Funding: simulate USDC funding reconciliation
    Funding-->>Domain: partial or reconciled funding result
    Domain-->>Api: funding transaction + ledger updates + exceptions if needed
    Api-->>Web: funded or partial state

    User->>Web: Dispatch payout
    Web->>Api: POST /payouts/:id/dispatch
    Api->>Domain: dispatchPayout()
    Domain->>Partner: simulate payout execution
    Partner-->>Domain: paid, failed, or review condition
    Domain-->>Api: payout status + batch status + exception/compliance case
    Api-->>Web: tracking update

    alt payout requires manual review
        Domain-->>Web: compliance case appears in queue
        User->>Web: Resolve compliance case
        Web->>Api: PATCH /batches/compliance/:caseId/resolve
        Api->>Domain: resolveComplianceCase()
        Domain-->>Api: resolved review
        Api-->>Web: updated status
    end

    alt payout fails or funding is incomplete
        Domain-->>Web: exception appears in inbox
        User->>Web: Resolve exception
        Web->>Api: PATCH /exceptions/:id/resolve
        Api->>Domain: resolveException()
        Domain-->>Api: resolved exception
        Api-->>Web: updated exception state
    end
```

## 5. Backend Internal Structure

```mermaid
flowchart TD
    Request[HTTP Request]
    Guard[DemoAuthGuard + RolesGuard]
    Controller[NestJS Controller]
    Service[DemoDomainService]

    subgraph DomainAreas[Business Areas Inside DemoDomainService]
        AuthArea[Auth]
        CompanyArea[Company]
        BeneficiaryArea[Beneficiaries]
        BatchArea[Batches]
        QuoteArea[Quotes]
        ApprovalArea[Approvals]
        FundingArea[Funding]
        PayoutArea[Payouts]
        ComplianceArea[Compliance]
        ExceptionArea[Exceptions]
        LedgerArea[Ledger]
        AuditArea[Audit Logs]
        WebhookArea[Webhook Events]
    end

    Response[JSON Response]

    Request --> Guard --> Controller --> Service
    Service --> AuthArea
    Service --> CompanyArea
    Service --> BeneficiaryArea
    Service --> BatchArea
    Service --> QuoteArea
    Service --> ApprovalArea
    Service --> FundingArea
    Service --> PayoutArea
    Service --> ComplianceArea
    Service --> ExceptionArea
    Service --> LedgerArea
    Service --> AuditArea
    Service --> WebhookArea
    Service --> Response
```

## 6. Architectural Reading

The architecture is strong for a demo because the full product story is already represented in software.

The main tradeoff is that the current design is centralized:

- business logic is concentrated in one large in-memory service
- persistence is designed but not yet wired in
- external integrations are represented as mocks rather than real adapters

That makes the system fast to demo and iterate on, but it also marks the next architectural transition clearly:

`in-memory orchestration -> modular services/repositories -> Prisma runtime -> persistent operational platform`

## 7. Recommended Next Architecture Step

The cleanest next evolution would be:

```mermaid
flowchart LR
    Web[React Web App]
    Api[NestJS API]

    subgraph Services[Backend Services]
        AuthS[Auth Service]
        CompanyS[Company Service]
        BeneficiaryS[Beneficiary Service]
        BatchS[Batch Service]
        QuoteS[Quote Service]
        FundingS[Funding Service]
        PayoutS[Payout Service]
        ComplianceS[Compliance Service]
        ExceptionS[Exception Service]
        AuditS[Audit Service]
    end

    subgraph Repos[Persistence + Integrations]
        PrismaRepo[Prisma Repositories]
        DB[(PostgreSQL)]
        SolanaAdapter[Funding Adapter]
        PartnerAdapter[Payout Partner Adapter]
    end

    Web --> Api
    Api --> AuthS
    Api --> CompanyS
    Api --> BeneficiaryS
    Api --> BatchS
    Api --> QuoteS
    Api --> FundingS
    Api --> PayoutS
    Api --> ComplianceS
    Api --> ExceptionS
    Api --> AuditS

    AuthS --> PrismaRepo
    CompanyS --> PrismaRepo
    BeneficiaryS --> PrismaRepo
    BatchS --> PrismaRepo
    QuoteS --> PrismaRepo
    FundingS --> PrismaRepo
    PayoutS --> PrismaRepo
    ComplianceS --> PrismaRepo
    ExceptionS --> PrismaRepo
    AuditS --> PrismaRepo

    PrismaRepo --> DB
    FundingS --> SolanaAdapter
    PayoutS --> PartnerAdapter
```

This would preserve the current product flow while making the codebase much easier to evolve safely.
