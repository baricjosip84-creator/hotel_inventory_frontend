import type { ReactNode } from 'react';

type Name =
  | 'dashboard' | 'actionCenter' | 'workspace' | 'mobileExecution' | 'operationsFeed' | 'workflowComposer'
  | 'intelligenceReview' | 'aiCopilot' | 'learningFeedback' | 'adaptivePolicy' | 'probabilisticForecast'
  | 'crossDomainOptimization' | 'collaboration' | 'digitalTwin' | 'reliabilityCommand' | 'alerts' | 'insights'
  | 'systemContext' | 'products' | 'suppliers' | 'stock' | 'stockMovements' | 'stockTransfers' | 'storageLocations'
  | 'advancedInventory' | 'scanner' | 'outbound' | 'usageLedger' | 'requisitions' | 'reservations'
  | 'executionRequests' | 'executionTasks' | 'automationSchedules' | 'purchaseOrders' | 'procurementRecommendations'
  | 'replenishmentPlanning' | 'shipments' | 'enterpriseInventory' | 'reports' | 'users' | 'permissions' | 'audit'
  | 'tenantSettings' | 'adminSystem' | 'sessions' | 'logout'
  | 'grid' | 'box' | 'usersLegacy' | 'layers' | 'trend' | 'transfer' | 'warehouse' | 'truck' | 'clipboard'
  | 'checklist' | 'calendar' | 'usage' | 'bolt' | 'chart' | 'gear' | 'monitor' | 'bell' | 'spark' | 'link'
  | 'scan' | 'document';

const tenantNames: Record<string, Name> = {
  '/dashboard': 'dashboard',
  '/action-center': 'actionCenter',
  '/workspace': 'workspace',
  '/mobile-execution': 'mobileExecution',
  '/real-time-operations-feed': 'operationsFeed',
  '/operations-feed': 'operationsFeed',
  '/workflow-composer': 'workflowComposer',
  '/intelligence-review': 'intelligenceReview',
  '/ai-copilot': 'aiCopilot',
  '/decision-learning-feedback': 'learningFeedback',
  '/adaptive-policy-engine': 'adaptivePolicy',
  '/probabilistic-forecasting': 'probabilisticForecast',
  '/cross-domain-optimization': 'crossDomainOptimization',
  '/collaboration': 'collaboration',
  '/digital-twin': 'digitalTwin',
  '/reliability-command': 'reliabilityCommand',
  '/alerts': 'alerts',
  '/insights': 'insights',
  '/system-context': 'systemContext',
  '/products': 'products',
  '/suppliers': 'suppliers',
  '/stock': 'stock',
  '/stock-movements': 'stockMovements',
  '/stock-transfers': 'stockTransfers',
  '/storage-locations': 'storageLocations',
  '/inventory-capabilities': 'advancedInventory',
  '/scanner': 'scanner',
  '/outbound': 'outbound',
  '/inventory-usage': 'usageLedger',
  '/inventory-requisitions': 'requisitions',
  '/inventory-reservations': 'reservations',
  '/execution-requests': 'executionRequests',
  '/execution-tasks': 'executionTasks',
  '/automation-schedules': 'automationSchedules',
  '/purchase-orders': 'purchaseOrders',
  '/procurement-recommendations': 'procurementRecommendations',
  '/replenishment-planning': 'replenishmentPlanning',
  '/shipments': 'shipments',
  '/enterprise-inventory': 'enterpriseInventory',
  '/reports': 'reports',
  '/users': 'users',
  '/permissions': 'permissions',
  '/audit': 'audit',
  '/tenant-settings': 'tenantSettings',
  '/admin-system': 'adminSystem',
  '/sessions': 'sessions',
  '/logout': 'logout'
};

function nameFor(path: string): Name {
  const normalizedPath = String(path || '').split('?')[0].split('#')[0];
  const exactTenant = tenantNames[normalizedPath];
  if (exactTenant) return exactTenant;

  if (normalizedPath.startsWith('/platform/')) {
    if (normalizedPath.includes('dashboard')) return 'grid';
    if (normalizedPath.includes('tenant') || normalizedPath.includes('customer-success') || normalizedPath.includes('provisioning') || normalizedPath.includes('onboarding')) return 'usersLegacy';
    if (normalizedPath.includes('launch') || normalizedPath.includes('readiness') || normalizedPath.includes('deployment') || normalizedPath.includes('documentation')) return 'checklist';
    if (normalizedPath.includes('billing') || normalizedPath.includes('subscription') || normalizedPath.includes('license') || normalizedPath.includes('capacity')) return 'chart';
    if (normalizedPath.includes('support') || normalizedPath.includes('session')) return 'monitor';
    if (normalizedPath.includes('health') || normalizedPath.includes('monitoring') || normalizedPath.includes('sla')) return 'trend';
    if (normalizedPath.includes('notification') || normalizedPath.includes('announcement') || normalizedPath.includes('incident') || normalizedPath.includes('risk')) return 'bell';
    if (normalizedPath.includes('api') || normalizedPath.includes('integration') || normalizedPath.includes('webhook') || normalizedPath.includes('vendor') || normalizedPath.includes('dependencies')) return 'link';
    if (normalizedPath.includes('permission') || normalizedPath.includes('access-review') || normalizedPath.includes('security') || normalizedPath.includes('maintenance') || normalizedPath.includes('change-management') || normalizedPath.includes('release')) return 'gear';
    if (normalizedPath.includes('operational-jobs')) return 'bolt';
    return 'document';
  }

  return 'document';
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

function P({ n }: { n: Name }): ReactNode {
  switch (n) {
    case 'dashboard': return <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>;
    case 'actionCenter': return <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></>;
    case 'workspace': return <><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5h8v2M3 11h18M10 11v2h4v-2"/></>;
    case 'mobileExecution': return <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M10 18h4M13 8l-3 5h3l-1 4 4-6h-3V8Z"/></>;
    case 'operationsFeed': return <><path d="M3 12h4l2-5 4 10 2-5h6"/><circle cx="20" cy="12" r="1.5"/></>;
    case 'workflowComposer': return <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.5 7.5l4.2 8.2M17.5 7.5l-4.2 8.2"/></>;
    case 'intelligenceReview': return <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/><path d="m18.5 4 .6 1.8L21 6.5l-1.9.7-.6 1.8-.6-1.8-1.9-.7 1.9-.7.6-1.8Z"/></>;
    case 'aiCopilot': return <><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M9 11h.01M15 11h.01M9 15h6M12 3v4M9 3h6"/></>;
    case 'learningFeedback': return <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="m8 10 2 2 5-5"/></>;
    case 'adaptivePolicy': return <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/></>;
    case 'probabilisticForecast': return <><path d="M3 18h18M5 18c2-8 4-12 7-12s5 4 7 12"/><path d="M8 18c1-5 2-8 4-8s3 3 4 8"/></>;
    case 'crossDomainOptimization': return <><path d="M4 7h6l4 10h6M17 14l3 3-3 3M4 17h6l4-10h6M17 4l3 3-3 3"/></>;
    case 'collaboration': return <><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c.5-4 2.2-6 5-6 1.3 0 2.4.4 3.2 1.2M21 20c-.5-4-2.2-6-5-6-1.3 0-2.4.4-3.2 1.2M10 18h4"/></>;
    case 'digitalTwin': return <><path d="m3 7 6-3 6 3-6 3-6-3Z"/><path d="m9 10 6-3 6 3-6 3-6-3Z"/><path d="M3 7v7l6 3 6-3V7M15 10v7l-6 3"/></>;
    case 'reliabilityCommand': return <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="M7 13h3l1.5-3 2 6 1.5-3h2"/></>;
    case 'alerts': return <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 21h4"/></>;
    case 'insights': return <><path d="M9 18h6M10 22h4M8 14c-1.5-1.2-2.5-3-2.5-5a6.5 6.5 0 0 1 13 0c0 2-1 3.8-2.5 5-1 .8-1.5 1.6-1.5 2.5h-5c0-.9-.5-1.7-1.5-2.5Z"/></>;
    case 'systemContext': return <><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></>;
    case 'products': return <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></>;
    case 'suppliers': return <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.5c3.1.3 4.7 2 5 5"/></>;
    case 'stock': return <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>;
    case 'stockMovements': return <><path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3 3m-3-3 3-3"/><circle cx="4" cy="16" r="1.5"/><circle cx="20" cy="8" r="1.5"/></>;
    case 'stockTransfers': return <><path d="M4 7h14l-3-3m3 3-3 3M20 17H6l3 3m-3-3 3-3"/><path d="M12 10v4"/></>;
    case 'storageLocations': return <><path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-7h10v7M9 13h6"/></>;
    case 'advancedInventory': return <><path d="m5 5 5-2 5 2-5 2-5-2ZM10 7v5l-5-2V5M15 5v5l-5 2"/><path d="m10 14 5-2 5 2-5 2-5-2ZM15 16v5l-5-2v-5M20 14v5l-5 2"/></>;
    case 'scanner': return <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 10v4M11 9v6M14 10v4M17 9v6"/></>;
    case 'outbound': return <><path d="M4 5h9v14H4z"/><path d="M10 12h10M16 8l4 4-4 4"/></>;
    case 'usageLedger': return <><path d="M5 4v16M5 20h15"/><path d="M9 15l3-3 3 2 4-6"/><circle cx="19" cy="8" r="1.5"/></>;
    case 'requisitions': return <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M14 9h2M8 15h8"/></>;
    case 'reservations': return <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h8"/></>;
    case 'executionRequests': return <><path d="M6 3h8l4 4v14H6zM14 3v5h5"/><path d="M9 14h6M12 11v6"/></>;
    case 'executionTasks': return <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5m-6 7 2 2 4-4M9 17h6"/></>;
    case 'automationSchedules': return <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M7 3l-2 2M17 3l2 2"/></>;
    case 'purchaseOrders': return <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4"/></>;
    case 'procurementRecommendations': return <><path d="M3 5h2l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="m17 3 .6 1.8 1.9.7-1.9.7L17 8l-.6-1.8-1.9-.7 1.9-.7L17 3Z"/></>;
    case 'replenishmentPlanning': return <><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v6l8 4 8-4V8"/><path d="M5 20h5l-2-2m2 2-2 2M19 20h-5l2-2m-2 2 2 2"/></>;
    case 'shipments': return <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>;
    case 'enterpriseInventory': return <><path d="M4 21V7l8-4 8 4v14"/><path d="M8 21v-5h8v5M8 9h2M14 9h2M8 12h2M14 12h2"/></>;
    case 'reports': return <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M17 6h4v4"/></>;
    case 'users': return <><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.3-7 8-7s7.2 2 8 7"/></>;
    case 'permissions': return <><circle cx="8" cy="11" r="4"/><path d="M12 11h9M18 11v3M15 11v2"/></>;
    case 'audit': return <><path d="M6 3h8l4 4v8"/><path d="M14 3v5h5"/><circle cx="12" cy="16" r="4"/><path d="m15 19 3 3"/></>;
    case 'tenantSettings': return <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></>;
    case 'adminSystem': return <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><circle cx="12" cy="12" r="2"/><path d="M12 8v2M12 14v2M8 12h2M14 12h2"/></>;
    case 'sessions': return <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M8 9h8M8 12h5"/></>;
    case 'logout': return <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>;

    case 'grid': return <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>;
    case 'box': return <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></>;
    case 'usersLegacy': return <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.5c3.1.3 4.7 2 5 5"/></>;
    case 'layers': return <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>;
    case 'trend': return <><path d="M4 18 9 12l4 3 7-9"/><path d="M15 6h5v5"/></>;
    case 'transfer': return <path d="M4 7h14l-3-3m3 3-3 3M20 17H6l3 3m-3-3 3-3"/>;
    case 'warehouse': return <><path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-7h10v7M9 13h6"/></>;
    case 'truck': return <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>;
    case 'clipboard': return <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4"/></>;
    case 'checklist': return <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M14 9h2M8 15h8"/></>;
    case 'calendar': return <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>;
    case 'usage': return <path d="M5 4v16M5 20h15M9 15l3-3 3 2 4-6"/>;
    case 'bolt': return <path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/>;
    case 'chart': return <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>;
    case 'gear': return <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></>;
    case 'monitor': return <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>;
    case 'bell': return <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 21h4"/></>;
    case 'spark': return <><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z"/><path d="m19 15 .7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15Z"/></>;
    case 'link': return <><path d="M10 13a4 4 0 0 0 5.7 0l2.3-2.3A4 4 0 0 0 12.3 5L11 6.3"/><path d="M14 11a4 4 0 0 0-5.7 0L6 13.3A4 4 0 0 0 11.7 19L13 17.7"/></>;
    case 'scan': return <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8"/>;
    default: return <path d="M6 3h8l4 4v14H6zM14 3v5h5"/>;
  }
}

export function TenantNavIcon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}>
      <P n={nameFor(path)} />
    </svg>
  );
}
