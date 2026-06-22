import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type PlatformMutationFeedback = {
  id: number;
  type: 'success' | 'error';
  message: string;
  requestId?: string;
};

type PlatformMutationFeedbackEvent = CustomEvent<Omit<PlatformMutationFeedback, 'id'>>;

const PLATFORM_MUTATION_FEEDBACK_EVENT = 'platform-mutation-feedback';

function PlatformMutationFeedbackToasts() {
  const [items, setItems] = useState<PlatformMutationFeedback[]>([]);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const feedbackEvent = event as PlatformMutationFeedbackEvent;
      const nextItem: PlatformMutationFeedback = {
        id: Date.now() + Math.random(),
        type: feedbackEvent.detail.type,
        message: feedbackEvent.detail.message,
        requestId: feedbackEvent.detail.requestId
      };

      setItems((current) => [...current.slice(-2), nextItem]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== nextItem.id));
      }, nextItem.type === 'success' ? 4500 : 7500);
    };

    window.addEventListener(PLATFORM_MUTATION_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(PLATFORM_MUTATION_FEEDBACK_EVENT, handleFeedback);
  }, []);

  if (!items.length) return null;

  return (
    <div style={styles.toastRegion} aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          style={{
            ...styles.toast,
            ...(item.type === 'success' ? styles.successToast : styles.errorToast)
          }}
        >
          <strong>{item.type === 'success' ? 'Saved' : 'Action failed'}</strong>
          <span>{item.message}</span>
          {item.requestId ? <small>Request ID: {item.requestId}</small> : null}
          <button
            type="button"
            style={styles.closeButton}
            onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
            aria-label="Dismiss platform message"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1
        }
      }
    });
  });

  const app = useMemo(() => (
    <>
      {children}
      <PlatformMutationFeedbackToasts />
    </>
  ), [children]);

  return <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>;
}

const styles: Record<string, CSSProperties> = {
  toastRegion: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    zIndex: 9999,
    display: 'grid',
    gap: '12px',
    width: 'min(420px, calc(100vw - 48px))',
    pointerEvents: 'none'
  },
  toast: {
    position: 'relative',
    display: 'grid',
    gap: '4px',
    padding: '14px 44px 14px 16px',
    borderRadius: '14px',
    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
    fontSize: '14px',
    lineHeight: 1.35,
    pointerEvents: 'auto'
  },
  successToast: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    color: '#166534'
  },
  errorToast: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#991b1b'
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '10px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    fontSize: '20px',
    lineHeight: 1,
    cursor: 'pointer'
  }
};
