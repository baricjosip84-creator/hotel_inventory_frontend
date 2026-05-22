import { useEffect } from 'react';

type SetNullableMessage = (message: string | null) => void;

export function useAutoClearEnterpriseInventoryStatusMessages(
  statusMessage: string | null,
  errorMessage: string | null,
  setStatusMessage: SetNullableMessage,
  setErrorMessage: SetNullableMessage
) {
  useEffect(() => {
    if (!statusMessage && !errorMessage) return;

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
      setErrorMessage(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [statusMessage, errorMessage, setStatusMessage, setErrorMessage]);
}
