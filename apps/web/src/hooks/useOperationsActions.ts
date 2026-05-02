import type { CreateBatchDto, CreateBeneficiaryDto, UpdatePayoutDto } from "@latam-payouts/contracts";
import { api, type BatchDetail } from "../lib/api";
import type { SessionState } from "./useSession";

type WorkspaceActionOptions = {
  session: SessionState;
  selectedBatch: BatchDetail | null;
  setLoading: (loading: boolean) => void;
  setMessage: (message: string) => void;
  setSelectedBatch: (batch: BatchDetail | null) => void;
  refreshWorkspace: (token: string, batchToRefresh?: BatchDetail | null) => Promise<void>;
};

export function useOperationsActions({
  session,
  selectedBatch,
  setLoading,
  setMessage,
  setSelectedBatch,
  refreshWorkspace,
}: WorkspaceActionOptions) {
  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!session) {
      return;
    }
    setLoading(true);
    try {
      await action();
      await refreshWorkspace(session.accessToken);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return {
    saveCompany(payload: { displayName: string; webhookUrl: string; authorizedWallets: string[] }) {
      void runAction(() => api.updateCompany(session!.accessToken, payload).then(() => Promise.resolve()), "Company settings updated.");
    },
    createBeneficiary(form: CreateBeneficiaryDto) {
      void runAction(() => api.createBeneficiary(session!.accessToken, form).then(() => Promise.resolve()), "Beneficiary created.");
    },
    updateBeneficiary(id: string, form: Partial<CreateBeneficiaryDto>) {
      void runAction(() => api.updateBeneficiary(session!.accessToken, id, form).then(() => Promise.resolve()), "Beneficiary updated.");
    },
    createBatch(form: CreateBatchDto) {
      void runAction(async () => {
        const detail = await api.createBatch(session!.accessToken, form);
        setSelectedBatch(detail);
      }, "Batch created.");
    },
    importBatch(name: string, csv: string) {
      void runAction(async () => {
        const detail = await api.importBatch(session!.accessToken, `${name} import`, csv);
        setSelectedBatch(detail);
      }, "CSV batch imported.");
    },
    createQuote(batchId: string) {
      void runAction(async () => {
        await api.createQuote(session!.accessToken, batchId);
        const detail = await api.getBatch(session!.accessToken, batchId);
        setSelectedBatch(detail);
      }, "Quote generated.");
    },
    approveBatch(batchId: string) {
      void runAction(async () => {
        const detail = await api.approveBatch(session!.accessToken, batchId, "Approved in console");
        setSelectedBatch(detail);
      }, "Batch approved.");
    },
    generateFunding(batchId: string) {
      void runAction(async () => {
        await api.getFundingInstructions(session!.accessToken, batchId);
        const detail = await api.getBatch(session!.accessToken, batchId);
        setSelectedBatch(detail);
      }, "Funding instructions generated.");
    },
    refreshFunding(instructionId: string) {
      void runAction(async () => {
        await api.rescanFundingInstruction(session!.accessToken, instructionId);
        if (selectedBatch) {
          const detail = await api.getBatch(session!.accessToken, selectedBatch.batch.id);
          setSelectedBatch(detail);
        }
      }, "Funding status refreshed.");
    },
    recordFallbackFunding(instructionId: string, amount: number) {
      void runAction(async () => {
        await api.recordFunding(session!.accessToken, {
          fundingInstructionId: instructionId,
          txHash: `MANUAL-FUNDING-${Date.now()}`,
          amountReceived: amount,
        });
        if (selectedBatch) {
          const detail = await api.getBatch(session!.accessToken, selectedBatch.batch.id);
          setSelectedBatch(detail);
        }
      }, "Manual funding fallback recorded.");
    },
    dispatchPayout(payoutId: string) {
      void runAction(async () => {
        await api.dispatchPayout(session!.accessToken, payoutId);
        if (selectedBatch) {
          const detail = await api.getBatch(session!.accessToken, selectedBatch.batch.id);
          setSelectedBatch(detail);
        }
      }, "Payout dispatched.");
    },
    updatePayout(payoutId: string, body: UpdatePayoutDto) {
      void runAction(async () => {
        await api.updatePayout(session!.accessToken, payoutId, body);
        if (selectedBatch) {
          const detail = await api.getBatch(session!.accessToken, selectedBatch.batch.id);
          setSelectedBatch(detail);
        }
      }, "Person payment updated.");
    },
    sendApprovedPayouts(batchId: string) {
      void runAction(async () => {
        const detail = await api.sendApprovedPayouts(session!.accessToken, batchId);
        setSelectedBatch(detail);
      }, "Approved payments sent.");
    },
    resolveException(exceptionId: string) {
      void runAction(() => api.resolveException(session!.accessToken, exceptionId).then(() => Promise.resolve()), "Exception resolved.");
    },
    resolveCompliance(caseId: string) {
      void runAction(
        () => api.resolveComplianceCase(session!.accessToken, caseId).then(() => Promise.resolve()),
        "Compliance case resolved.",
      );
    },
  };
}
