# Despliegue

Este proyecto se despliega como un monorepo compartido con `pnpm`:

- `apps/api` corre en Railway.
- `apps/web` corre en Vercel.
- `packages/contracts` es compartido por ambas apps, así que ambas plataformas deben construir desde la raiz del repositorio.

## API en Railway

Crea un proyecto en Railway desde la raiz del repositorio y agrega un servicio de PostgreSQL. Railway debe usar el archivo `railway.toml` ubicado en la raiz.

El build de la API ejecuta:

```bash
pnpm --filter @latam-payouts/api deploy:build
```

Antes de iniciar cada despliegue, Railway ejecuta:

```bash
pnpm --filter @latam-payouts/api deploy:prepare
```

Ese comando aplica el esquema de Prisma con `prisma db push` y carga los datos demo. El script de seed es idempotente para sus propios registros `seed_*`.

Configura estas variables en el servicio de API de Railway:

```bash
DATABASE_URL=<provista por Railway Postgres>
JWT_SECRET=<secret fuerte>
WEBHOOK_SIGNING_SECRET=<secret fuerte>
DEFAULT_AUTHORIZED_WALLETS=<direcciones wallet de testnet separadas por comas>
SOLANA_CLUSTER=testnet
SOLANA_RPC_URL=https://api.testnet.solana.com
SOLANA_USDC_MINT=<mint de USDC en testnet o mock USDC>
SOLANA_TREASURY_WALLET=<public key de la wallet treasury>
FUNDING_WATCH_ENABLED=true
FUNDING_WATCH_INTERVAL_MS=15000
CORS_ORIGIN=https://<tu-app-vercel>.vercel.app
```

Despues del despliegue, verifica:

```bash
curl https://<tu-api>.up.railway.app/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

## Web en Vercel

Importa el mismo repositorio en Vercel y manten la raiz del proyecto en la raiz del repositorio. El archivo `vercel.json` de la raiz construye solo la app web y sirve `apps/web/dist`.

Configura estas variables en Vercel:

```bash
VITE_API_URL=https://<tu-api>.up.railway.app
VITE_SOLANA_RPC_URL=https://api.testnet.solana.com
VITE_SOLANA_USDC_DECIMALS=6
```

Despues del despliegue, verifica:

- La pantalla de login carga sin hacer requests a `localhost`.
- El login demo funciona con `finance@acme-pay.com` / `demo123`.
- Al refrescar una ruta del cliente como `/batches`, Vercel sigue sirviendo la app de React.

## Verificacion Local

Corre estas validaciones antes de hacer push:

```bash
pnpm --filter @latam-payouts/api build
pnpm --filter @latam-payouts/web build
```
