import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PLATFORM_MUTATION_FEEDBACK_EVENT, TENANT_MUTATION_FEEDBACK_EVENT } from '../lib/actionFeedback';

type ActionFeedback = {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  requestId?: string;
};

type ActionFeedbackEvent = CustomEvent<Omit<ActionFeedback, 'id'>>;

const GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT = 'global-dangerous-action-confirm';

type GlobalConfirmBypassState = {
  activeUntil: number;
};

const globalConfirmBypass: GlobalConfirmBypassState = {
  activeUntil: 0
};

function normalizeButtonLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

type ActionElement = HTMLButtonElement | HTMLAnchorElement | HTMLInputElement;

function normalizedActionLabel(element: ActionElement): string {
  const ariaLabel = element.getAttribute('aria-label') || '';
  const title = element.getAttribute('title') || '';
  const inputValue = element instanceof HTMLInputElement ? element.value : '';
  const visibleLabel = element instanceof HTMLInputElement ? '' : element.innerText || element.textContent || '';
  return normalizeButtonLabel(visibleLabel || ariaLabel || title || inputValue);
}

function isActionInsideNavigation(element: ActionElement): boolean {
  return Boolean(element.closest('nav, [role="navigation"], [data-global-action-feedback-scope="navigation"]'));
}

function isActionExplicitlySkipped(element: ActionElement): boolean {
  return (
    element.dataset.skipGlobalActionFeedback === 'true' ||
    element.dataset.skipGlobalConfirm === 'true' ||
    element.closest('[data-skip-global-action-feedback="true"]') !== null
  );
}

function isBenignButtonLabel(label: string): boolean {
  const normalized = label.toLowerCase();

  return (
    !normalized ||
    normalized === '×' ||
    normalized === '☰' ||
    normalized === 'cancel' ||
    normalized === 'cancel edit' ||
    normalized === 'cancel editing' ||
    normalized === 'cancel form' ||
    normalized === 'close' ||
    normalized === 'i copied it' ||
    normalized === 'clear message' ||
    normalized === 'clear bulk selection' ||
    normalized.startsWith('close detail') ||
    normalized.startsWith('close cost history') ||
    normalized.startsWith('close packages') ||
    normalized.startsWith('previous ') ||
    normalized.startsWith('next ') ||
    normalized.startsWith('page ') ||
    normalized.startsWith('any risk') ||
    normalized.startsWith('high risk') ||
    normalized.startsWith('medium risk') ||
    normalized.startsWith('low risk') ||
    normalized.startsWith('no risk') ||
    normalized.startsWith('excellent') ||
    normalized.startsWith('strong') ||
    normalized.startsWith('watch') ||
    normalized.startsWith('risk tier')
  );
}

function isDangerousButtonLabel(label: string): boolean {
  const normalized = label.toLowerCase();

  if (isBenignButtonLabel(label)) return false;

  const exactDangerousLabels = new Set([
    'delete',
    'remove',
    'archive',
    'disable',
    'enable',
    'revoke',
    'rotate',
    'reject',
    'approve',
    'execute',
    'finalize',
    'complete',
    'block',
    'unblock',
    'activate',
    'allocate',
    'expire',
    'release',
    'recover',
    'resolve',
    'reopen',
    'escalate',
    'publish',
    'pause',
    'resume',
    'ready',
    'assign',
    'start',
    'reset password',
    'create/reset tenant user',
    'cancel incident',
    'cancel request',
    'cancel purchase order',
    'cancel order',
    'cancel task',
    'close purchase order',
    'run worker once',
    'run heartbeat check',
    'apply billing reconciliation',
    'clean closed notifications',
    'renew subscription',
    'ingest provider event',
    'override blocking alert',
    'confirm and acknowledge anomaly review',
    'run due schedules once',
    'run schedule',
    'dry run',
    'audit pack',
    'mark executed',
    'reviewed'
  ]);

  if (exactDangerousLabels.has(normalized)) return true;

  return (
    normalized.startsWith('delete ') ||
    normalized.startsWith('remove ') ||
    normalized.startsWith('archive ') ||
    normalized.startsWith('disable ') ||
    normalized.startsWith('enable ') ||
    normalized.startsWith('revoke ') ||
    normalized.startsWith('rotate ') ||
    normalized.startsWith('reject ') ||
    normalized.startsWith('approve ') ||
    normalized.startsWith('execute ') ||
    normalized.startsWith('finalize ') ||
    /^(cancel|close) (incident|request|purchase order|order|task|workflow|execution|window|subscription)/.test(normalized) ||
    normalized.startsWith('complete ') ||
    normalized.startsWith('block ') ||
    normalized.startsWith('unblock ') ||
    normalized.startsWith('activate ') ||
    normalized.startsWith('allocate ') ||
    normalized.startsWith('fulfill ') ||
    normalized.startsWith('release ') ||
    normalized.startsWith('recover ') ||
    normalized.startsWith('resolve ') ||
    normalized.startsWith('reopen ') ||
    normalized.startsWith('escalate ') ||
    normalized.startsWith('publish ') ||
    normalized.startsWith('pause ') ||
    normalized.startsWith('resume ') ||
    normalized.startsWith('reset password') ||
    normalized.startsWith('apply ') ||
    normalized.startsWith('run worker') ||
    normalized.startsWith('run heartbeat') ||
    normalized.startsWith('run operational') ||
    normalized.startsWith('run integration') ||
    normalized.startsWith('run due') ||
    normalized.startsWith('run schedule') ||
    normalized.startsWith('mark ') ||
    normalized.startsWith('override ')
  );
}

function getLocalActionFeedbackMessage(label: string): string | null {
  const normalized = label.toLowerCase();

  if (isBenignButtonLabel(label)) {
    if (normalized.startsWith('clear') || normalized.startsWith('reset filters')) return 'Filters cleared.';
    if (normalized === 'cancel' || normalized === 'cancel edit' || normalized === 'cancel editing' || normalized === 'cancel form') return 'Cancelled.';
    return null;
  }

  if (normalized === 'edit' || normalized.startsWith('edit ')) return 'Edit form opened.';
  if (normalized.startsWith('select ') || normalized.startsWith('use this preset')) return 'Selection changed.';
  if (normalized.startsWith('reset ') || normalized === 'reset') return 'Reset applied.';
  if (normalized.startsWith('clear ')) return 'Cleared.';
  if (normalized.startsWith('refresh') || normalized.includes(' refresh')) return 'Refresh started.';
  if (normalized.startsWith('load ') || normalized.includes(' load ')) return 'Loading requested.';
  if (normalized.startsWith('view ') || normalized.startsWith('open ')) return 'Opening details.';
  if (normalized.startsWith('copy ')) return 'Copy action started.';
  if (normalized.startsWith('print ')) return 'Print action started.';
  if (normalized.startsWith('export ')) return 'Export started.';
  if (normalized.startsWith('generate ')) return 'Generation started.';
  if (normalized.startsWith('preview ')) return 'Preview started.';
  if (normalized.startsWith('scan') || normalized.includes(' scan')) return 'Scan started.';
  if (normalized.startsWith('start scanner')) return 'Scanner starting.';
  if (normalized.startsWith('stop scanner')) return 'Scanner stopping.';
  if (normalized.startsWith('upload ')) return 'Upload action started.';
  if (normalized.startsWith('add ')) return 'Add action started.';
  if (normalized.startsWith('append ') || normalized.startsWith('replace ')) return 'Bulk edit applied.';
  if (normalized.startsWith('dry run')) return 'Dry run started.';
  if (normalized.includes('audit pack')) return 'Audit pack loading.';
  if (normalized.includes('security audit')) return 'Security audit loading.';
  if (normalized.includes('execution review')) return 'Execution review loading.';

  /*
    Final coverage fallback.

    This makes the button/action UX feature exhaustive for rendered controls:
    every non-navigation, non-benign, non-explicitly-skipped action gets at
    least one visible response even when an individual page uses a custom local
    handler that does not call the shared API helpers. API mutations still show
    their specific success/error messages when the request finishes.
  */
  return 'Action started.';
}

function findClickedActionElement(target: EventTarget | null): ActionElement | null {
  if (!(target instanceof Element)) return null;

  const actionElement = target.closest('button, a[href], [role="button"], input[type="button"], input[type="submit"], input[type="reset"]');
  if (
    actionElement instanceof HTMLButtonElement ||
    actionElement instanceof HTMLAnchorElement ||
    actionElement instanceof HTMLInputElement
  ) {
    return actionElement;
  }

  return null;
}

function isDisabledActionElement(element: ActionElement): boolean {
  if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) return element.disabled;
  return element.getAttribute('aria-disabled') === 'true';
}

function normalizedFormLabel(form: HTMLFormElement): string {
  const ariaLabel = form.getAttribute('aria-label') || '';
  const title = form.getAttribute('title') || '';
  const heading = form.closest('section, article, main, div')?.querySelector('h1, h2, h3')?.textContent || '';
  return normalizeButtonLabel(ariaLabel || title || heading || 'Form');
}

function isFormExplicitlySkipped(form: HTMLFormElement): boolean {
  return (
    form.dataset.skipGlobalActionFeedback === 'true' ||
    form.closest('[data-skip-global-action-feedback="true"]') !== null
  );
}

function isAuthForm(form: HTMLFormElement): boolean {
  return Boolean(form.closest('[data-auth-form="true"]')) || /login|password|mfa/i.test(normalizedFormLabel(form));
}

function shouldSuppressGenericFormSubmitFeedback(form: HTMLFormElement): boolean {
  const label = normalizedFormLabel(form).toLowerCase();

  return (
    label === 'create product' ||
    label === 'edit product' ||
    label === 'create barcode label' ||
    label.endsWith(' product')
  );
}

function useGlobalButtonActionSafety(): void {
  useEffect(() => {
    const originalConfirm = window.confirm.bind(window);
    const originalPrint = window.print.bind(window);
    const originalWriteText = navigator.clipboard?.writeText?.bind(navigator.clipboard);

    window.confirm = (message?: string) => {
      if (performance.now() < globalConfirmBypass.activeUntil) {
        return true;
      }

      return originalConfirm(message);
    };

    window.print = () => {
      window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
        detail: { type: 'info', message: 'Print dialog opened.' }
      }));
      return originalPrint();
    };

    if (navigator.clipboard && originalWriteText) {
      navigator.clipboard.writeText = async (text: string) => {
        try {
          await originalWriteText(text);
          window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
            detail: { type: 'success', message: 'Copied to clipboard.' }
          }));
        } catch (error) {
          window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
            detail: { type: 'error', message: error instanceof Error ? error.message : 'Clipboard copy failed.' }
          }));
          throw error;
        }
      };
    }

    const handleGlobalButtonClick = (event: MouseEvent) => {
      const button = findClickedActionElement(event.target);
      if (!button || isDisabledActionElement(button) || isActionExplicitlySkipped(button) || isActionInsideNavigation(button)) return;

      const label = normalizedActionLabel(button);
      if (!label) return;

      if (isDangerousButtonLabel(label)) {
        const confirmed = originalConfirm(`Confirm action: ${label}?`);
        if (!confirmed) {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
            detail: { type: 'info', message: 'Action cancelled.' }
          }));
          return;
        }

        globalConfirmBypass.activeUntil = performance.now() + 1000;
        window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
          detail: { type: 'info', message: 'Action confirmed.' }
        }));
        return;
      }

      const isFormSubmitAction =
        (button instanceof HTMLButtonElement || button instanceof HTMLInputElement) &&
        (button.type || '').toLowerCase() === 'submit';

      if (!isFormSubmitAction) {
        const localActionFeedback = getLocalActionFeedbackMessage(label);
        if (localActionFeedback) {
          window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
            detail: { type: 'info', message: localActionFeedback }
          }));
        }
      }
    };

    const handleGlobalFormSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        isFormExplicitlySkipped(form) ||
        isAuthForm(form) ||
        shouldSuppressGenericFormSubmitFeedback(form)
      ) {
        return;
      }

      window.dispatchEvent(new CustomEvent(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, {
        detail: { type: 'info', message: `${normalizedFormLabel(form)} submitted.` }
      }));
    };

    const handleGlobalActionFeedback = (event: Event) => {
      const feedbackEvent = event as ActionFeedbackEvent;
      window.dispatchEvent(new CustomEvent(TENANT_MUTATION_FEEDBACK_EVENT, { detail: feedbackEvent.detail }));
    };

    document.addEventListener('click', handleGlobalButtonClick, true);
    document.addEventListener('submit', handleGlobalFormSubmit, true);
    window.addEventListener(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, handleGlobalActionFeedback);

    return () => {
      window.confirm = originalConfirm;
      window.print = originalPrint;
      if (navigator.clipboard && originalWriteText) {
        navigator.clipboard.writeText = originalWriteText;
      }
      document.removeEventListener('click', handleGlobalButtonClick, true);
      document.removeEventListener('submit', handleGlobalFormSubmit, true);
      window.removeEventListener(GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT, handleGlobalActionFeedback);
    };
  }, []);
}


function ActionFeedbackToasts() {
  const [items, setItems] = useState<ActionFeedback[]>([]);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const feedbackEvent = event as ActionFeedbackEvent;
      const nextItem: ActionFeedback = {
        id: Date.now() + Math.random(),
        type: feedbackEvent.detail.type,
        message: feedbackEvent.detail.message,
        requestId: feedbackEvent.detail.requestId
      };

      setItems((current) => [...current.slice(-2), nextItem]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== nextItem.id));
      }, nextItem.type === 'success' ? 4500 : nextItem.type === 'info' ? 5500 : 7500);
    };

    window.addEventListener(PLATFORM_MUTATION_FEEDBACK_EVENT, handleFeedback);
    window.addEventListener(TENANT_MUTATION_FEEDBACK_EVENT, handleFeedback);

    return () => {
      window.removeEventListener(PLATFORM_MUTATION_FEEDBACK_EVENT, handleFeedback);
      window.removeEventListener(TENANT_MUTATION_FEEDBACK_EVENT, handleFeedback);
    };
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
            ...(item.type === 'success' ? styles.successToast : item.type === 'info' ? styles.infoToast : styles.errorToast)
          }}
        >
          <strong>{item.type === 'success' ? 'Success' : item.type === 'info' ? 'Info' : 'Action failed'}</strong>
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
  useGlobalButtonActionSafety();
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
      <ActionFeedbackToasts />
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
  infoToast: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1d4ed8'
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
