import { Keypair } from "@solana/web3.js";
import type { ExceptionType, FundingStatus } from "@latam-payouts/contracts";

export const USDC_DECIMALS = 6;

export interface FundingObservation {
  signature: string;
  reference: string;
  mint: string;
  fromAddress?: string;
  toAddress: string;
  amountReceived: number;
  rawAmount: string;
  slot?: number;
  confirmedAt?: string;
}

export interface FundingValidationInput {
  observation: FundingObservation;
  authorizedWallets: string[];
  expectedReference: string;
  expectedMint: string;
  expectedDestination: string;
  expectedAmount: number;
  currentCreditedAmount: number;
}

export interface FundingValidationResult {
  accepted: boolean;
  exceptionType?: ExceptionType;
  summary?: string;
  nextStatus: FundingStatus;
  creditedAmount: number;
  nextCreditedAmount: number;
  surplusAmount: number;
}

export function generateFundingReference(): string {
  return Keypair.generate().publicKey.toBase58();
}

export function roundUsdcAmount(value: number): number {
  return Number(value.toFixed(USDC_DECIMALS));
}

export function determineFundingStatus(totalReceived: number, expectedAmount: number): FundingStatus {
  if (totalReceived <= 0) {
    return "pending";
  }

  return totalReceived >= expectedAmount ? "reconciled" : "partial";
}

export function decimalToRawAmount(amount: number, decimals = USDC_DECIMALS): string {
  return Math.round(amount * 10 ** decimals).toString();
}

export function evaluateFundingObservation(input: FundingValidationInput): FundingValidationResult {
  const { observation, authorizedWallets, expectedReference, expectedMint, expectedDestination, expectedAmount, currentCreditedAmount } =
    input;
  const currentStatus = determineFundingStatus(currentCreditedAmount, expectedAmount);

  if (observation.reference !== expectedReference) {
    return {
      accepted: false,
      exceptionType: "funding_reference_missing",
      summary: `Funding transaction ${observation.signature} does not include the expected batch reference.`,
      nextStatus: currentStatus,
      creditedAmount: 0,
      nextCreditedAmount: currentCreditedAmount,
      surplusAmount: Math.max(0, roundUsdcAmount(currentCreditedAmount - expectedAmount)),
    };
  }

  if (observation.mint !== expectedMint) {
    return {
      accepted: false,
      exceptionType: "funding_invalid_mint",
      summary: `Funding transaction ${observation.signature} used an unexpected token mint.`,
      nextStatus: currentStatus,
      creditedAmount: 0,
      nextCreditedAmount: currentCreditedAmount,
      surplusAmount: Math.max(0, roundUsdcAmount(currentCreditedAmount - expectedAmount)),
    };
  }

  if (observation.toAddress !== expectedDestination) {
    return {
      accepted: false,
      exceptionType: "funding_invalid_destination",
      summary: `Funding transaction ${observation.signature} targeted a different token account than the treasury ATA.`,
      nextStatus: currentStatus,
      creditedAmount: 0,
      nextCreditedAmount: currentCreditedAmount,
      surplusAmount: Math.max(0, roundUsdcAmount(currentCreditedAmount - expectedAmount)),
    };
  }

  if (!observation.fromAddress || (authorizedWallets.length > 0 && !authorizedWallets.includes(observation.fromAddress))) {
    return {
      accepted: false,
      exceptionType: "funding_wallet_unauthorized",
      summary: `Funding transaction ${observation.signature} came from a wallet that is not authorized for this company.`,
      nextStatus: currentStatus,
      creditedAmount: 0,
      nextCreditedAmount: currentCreditedAmount,
      surplusAmount: Math.max(0, roundUsdcAmount(currentCreditedAmount - expectedAmount)),
    };
  }

  const nextCreditedAmount = roundUsdcAmount(currentCreditedAmount + observation.amountReceived);
  const nextStatus = determineFundingStatus(nextCreditedAmount, expectedAmount);

  return {
    accepted: true,
    nextStatus,
    creditedAmount: observation.amountReceived,
    nextCreditedAmount,
    surplusAmount: Math.max(0, roundUsdcAmount(nextCreditedAmount - expectedAmount)),
  };
}
