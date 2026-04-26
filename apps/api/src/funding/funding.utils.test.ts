import { describe, expect, it } from "vitest";
import { determineFundingStatus, evaluateFundingObservation, generateFundingReference } from "./funding.utils.js";

describe("funding.utils", () => {
  it("generates unique funding references", () => {
    const references = new Set(Array.from({ length: 10 }, () => generateFundingReference()));
    expect(references.size).toBe(10);
  });

  it("classifies reconciled and partial funding amounts", () => {
    expect(determineFundingStatus(0, 100)).toBe("pending");
    expect(determineFundingStatus(50, 100)).toBe("partial");
    expect(determineFundingStatus(100, 100)).toBe("reconciled");
    expect(determineFundingStatus(125, 100)).toBe("reconciled");
  });

  it("validates wallet, mint, destination, and overfunding", () => {
    const accepted = evaluateFundingObservation({
      observation: {
        signature: "sig-ok",
        reference: "ref-1",
        mint: "mint-1",
        fromAddress: "wallet-1",
        toAddress: "ata-1",
        amountReceived: 120,
        rawAmount: "120000000",
      },
      authorizedWallets: ["wallet-1"],
      expectedReference: "ref-1",
      expectedMint: "mint-1",
      expectedDestination: "ata-1",
      expectedAmount: 100,
      currentCreditedAmount: 0,
    });

    expect(accepted.accepted).toBe(true);
    expect(accepted.nextStatus).toBe("reconciled");
    expect(accepted.surplusAmount).toBe(20);

    const unauthorized = evaluateFundingObservation({
      observation: {
        signature: "sig-bad-wallet",
        reference: "ref-1",
        mint: "mint-1",
        fromAddress: "wallet-2",
        toAddress: "ata-1",
        amountReceived: 20,
        rawAmount: "20000000",
      },
      authorizedWallets: ["wallet-1"],
      expectedReference: "ref-1",
      expectedMint: "mint-1",
      expectedDestination: "ata-1",
      expectedAmount: 100,
      currentCreditedAmount: 0,
    });

    expect(unauthorized.accepted).toBe(false);
    expect(unauthorized.exceptionType).toBe("funding_wallet_unauthorized");

    const invalidMint = evaluateFundingObservation({
      observation: {
        signature: "sig-bad-mint",
        reference: "ref-1",
        mint: "mint-2",
        fromAddress: "wallet-1",
        toAddress: "ata-1",
        amountReceived: 20,
        rawAmount: "20000000",
      },
      authorizedWallets: ["wallet-1"],
      expectedReference: "ref-1",
      expectedMint: "mint-1",
      expectedDestination: "ata-1",
      expectedAmount: 100,
      currentCreditedAmount: 0,
    });

    expect(invalidMint.accepted).toBe(false);
    expect(invalidMint.exceptionType).toBe("funding_invalid_mint");

    const invalidDestination = evaluateFundingObservation({
      observation: {
        signature: "sig-bad-destination",
        reference: "ref-1",
        mint: "mint-1",
        fromAddress: "wallet-1",
        toAddress: "ata-2",
        amountReceived: 20,
        rawAmount: "20000000",
      },
      authorizedWallets: ["wallet-1"],
      expectedReference: "ref-1",
      expectedMint: "mint-1",
      expectedDestination: "ata-1",
      expectedAmount: 100,
      currentCreditedAmount: 0,
    });

    expect(invalidDestination.accepted).toBe(false);
    expect(invalidDestination.exceptionType).toBe("funding_invalid_destination");
  });
});
