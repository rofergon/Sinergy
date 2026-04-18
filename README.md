# LatAm Payouts MVP

Monorepo base for a global payroll payouts MVP focused on companies outside Latin America that pay contractors and distributed teams in Colombia and Mexico.

## Stack

- `apps/api`: NestJS API with a demo in-memory domain service, Prisma schema, RBAC scaffolding, and payout workflow endpoints
- `apps/web`: React operations console with dashboard, beneficiaries, batches, funding, tracking, exceptions, and reports
- `packages/contracts`: shared domain types, enums, and DTOs
- `PostgreSQL + Prisma`: persistence foundation for the next iteration

## Product assumptions

- Funding rail: `USDC on Solana`
- Payout method: `bank_transfer`
- Corridors: `CO`, `MX`
- Roles: `admin`, `finance_operator`, `approver`, `compliance_reviewer`

## Getting started

1. Install `pnpm` if it is not already available.
2. Start Postgres if you want to wire Prisma next:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
pnpm install
```

4. Run the workspace:

```bash
pnpm dev
```

## Demo credentials

- `finance@acme-pay.com` / `demo123`
- `approver@acme-pay.com` / `demo123`
- `compliance@acme-pay.com` / `demo123`

The current backend is intentionally runnable with a demo state service so the vertical slice can be exercised immediately. The Prisma schema and workspace structure are in place so repositories can be migrated from in-memory state to PostgreSQL without changing the public contracts.

