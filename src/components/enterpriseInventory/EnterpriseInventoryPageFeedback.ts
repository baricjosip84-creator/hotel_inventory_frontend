import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import { refreshSystemContextQueries } from "./EnterpriseInventoryRefresh";
import { useAutoClearEnterpriseInventoryStatusMessages } from "./EnterpriseInventoryStatus";

export function useEnterpriseInventoryPageFeedback() {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useAutoClearEnterpriseInventoryStatusMessages(
    statusMessage,
    errorMessage,
    setStatusMessage,
    setErrorMessage,
  );

  const mutationFeedback = createEnterpriseInventoryBoundMutationFeedback(
    setStatusMessage,
    setErrorMessage,
    queryClient,
  );

  const refreshSystemContext = useCallback(
    () => refreshSystemContextQueries(queryClient),
    [queryClient],
  );

  return {
    errorMessage,
    mutationFeedback,
    refreshSystemContext,
    setErrorMessage,
    setStatusMessage,
    statusMessage,
  };
}
