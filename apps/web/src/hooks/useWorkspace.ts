import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { api, type BatchDetail, type BootstrapPayload } from "../lib/api";
import type { SessionState } from "./useSession";

export function useWorkspace(session: SessionState, setMessage: (message: string) => void) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedBatchRef = useRef<BatchDetail | null>(null);

  function updateSelectedBatch(batch: BatchDetail | null) {
    selectedBatchRef.current = batch;
    setSelectedBatch(batch);
  }

  const refreshWorkspace = useCallback(
    async (token: string, batchToRefresh?: BatchDetail | null) => {
      setLoading(true);
      try {
        const bootstrap = await api.bootstrap(token);
        startTransition(() => {
          setData(bootstrap);
        });

        const currentBatch = batchToRefresh ?? selectedBatchRef.current;
        if (currentBatch) {
          const detail = await api.getBatch(token, currentBatch.batch.id);
          updateSelectedBatch(detail);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load workspace data.");
      } finally {
        setLoading(false);
      }
    },
    [setMessage],
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshWorkspace(session.accessToken);
  }, [session?.accessToken, refreshWorkspace]);

  async function openBatch(batchId: string) {
    if (!session) {
      return;
    }
    setLoading(true);
    try {
      const detail = await api.getBatch(session.accessToken, batchId);
      updateSelectedBatch(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load the batch.");
    } finally {
      setLoading(false);
    }
  }

  function resetWorkspace() {
    setData(null);
    updateSelectedBatch(null);
  }

  return {
    data,
    selectedBatch,
    loading,
    setLoading,
    setSelectedBatch: updateSelectedBatch,
    refreshWorkspace,
    openBatch,
    resetWorkspace,
  };
}
