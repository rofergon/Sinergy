interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_SOLANA_USDC_DECIMALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
