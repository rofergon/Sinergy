![Sinergy Sol](./apps/web/public/sinergy%20sol.png)

# LatAm Payouts MVP

Monorepo base for a global payroll payouts MVP focused on companies outside Latin America that pay contractors and distributed teams in Latam
.

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
2. Create a local `.env` from `.env.example` and fill in the Solana treasury wallet and USDC mint for Devnet.
3. Start Postgres:

```bash
docker compose up -d
```

If you are running without Docker in WSL and installed PostgreSQL directly, you can use the helper scripts instead:

```bash
pnpm stack:start
```

To restart PostgreSQL, re-apply the Prisma schema, and boot the workspace again:

```bash
pnpm stack:restart
```

4. Install dependencies:

```bash
pnpm install
```

5. Push the Prisma schema for the funding persistence layer:

```bash
pnpm --filter @latam-payouts/api prisma:push
```

6. Optional: seed PostgreSQL with valid demo operations in multiple states:

```bash
pnpm --filter @latam-payouts/api seed:operations
```

The seed is idempotent for its own `seed_*` records and creates examples for Colombia, Mexico, and Argentina across approval, funding, dispatching, completed, failed, and review states.

7. Run the workspace:

```bash
pnpm dev
```

## Onchain funding setup

The MVP now includes a real `funding + reconciliation` layer for `USDC on Solana Devnet`.

- `GET /batches/:id/funding-instructions` generates a persistent funding instruction with treasury wallet, treasury ATA, mint, reference, memo, and expected amount.
- The API polls Solana for transfers that include the batch `reference` and reconcile accepted deposits into the batch state.
- `POST /funding/instructions/:id/rescan` lets ops manually trigger a reconciliation pass.
- `POST /funding/transactions` remains available as a manual fallback for demos and support flows.

## Localnet-first workflow

You can develop the funding flow against a local Solana validator and avoid faucet limits.

1. Start the local validator in one terminal:

```bash
pnpm localnet:validator
```

2. Bootstrap the local USDC mint, treasury wallet, and authorized company wallet in another terminal:

```bash
pnpm localnet:setup
```

This generates:

- `apps/api/.localnet/keys/*.json` keypairs for payer, treasury, and company
- `apps/api/.env.localnet` with localnet RPC, mint, treasury wallet, and authorized wallet values

3. Optional: if you want to exercise the Prisma-backed persistence path instead of the default in-memory localnet mode, push the Prisma schema using the localnet env:

```bash
pnpm localnet:dbpush
```

4. Run the API with localnet env values loaded:

```bash
pnpm --filter @latam-payouts/api dev:localnet
```

5. Run the web app in a separate terminal:

```bash
pnpm --filter @latam-payouts/web dev
```

6. Run an end-to-end smoke test once the API is up:

```bash
pnpm localnet:smoke
```

The smoke test logs in, creates a batch, quotes and approves it, generates funding instructions, sends local USDC with the onchain `reference`, triggers a rescan, and verifies the batch reaches `funded`.

If you want one command that starts the API with localnet env values and runs the smoke flow in the same WSL session, use:

```bash
pnpm localnet:e2e
```

The localnet workflow defaults to `FUNDING_PERSISTENCE_MODE=memory`, so you can run the funding E2E without Docker or Postgres.

## Demo credentials

- `finance@acme-pay.com` / `demo123`
- `approver@acme-pay.com` / `demo123`
- `compliance@acme-pay.com` / `demo123`

The current backend is intentionally runnable with a demo state service so the vertical slice can be exercised immediately. The Prisma schema and workspace structure are in place so repositories can be migrated from in-memory state to PostgreSQL without changing the public contracts.
