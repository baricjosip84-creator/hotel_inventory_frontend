import { TENANT_PERMISSIONS, type TenantPermission } from '../lib/permissions';

export type TenantUserRole = 'admin' | 'manager' | 'staff';

export type TenantNavigationItem = {
  to: string;
  label: string;
  description: string;
  section: string;
  permission?: TenantPermission;
  roles?: TenantUserRole[];
};

export type TenantModuleRegistryEntry = TenantNavigationItem & {
  id: string;
  moduleGroupId: string;
  moduleGroupLabel: string;
  commercialSurface: 'command' | 'inventory' | 'execution' | 'procurement' | 'reporting' | 'administration';
  priority: 'primary' | 'secondary' | 'governance';
  searchTerms: string[];
};

export type TenantNavigationSection = {
  id: string;
  label: string;
  items: TenantNavigationItem[];
};

export type TenantPageMeta = {
  title: string;
  subtitle: string;
};

export const tenantNavigationSections: TenantNavigationSection[] = [
  {
    id: 'command',
    label: 'Command',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        description: 'Operational overview, intelligence signals, and recent activity.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.DASHBOARD_READ
      },
      {
        to: '/action-center',
        label: 'Action Center',
        description: 'Prioritized cross-domain operational action inbox sourced from the backend command foundation.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/workspace',
        label: 'Workspace',
        description: 'Role-aware operational workspace with backend-filtered widgets, guidance, and next-action context.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/mobile-execution',
        label: 'Mobile Execution',
        description: 'Touch-first mobile execution queue sourced from the backend read-only mobile execution platform foundation.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/real-time-operations-feed',
        label: 'Operations Feed',
        description: 'Real-time event coordination timeline for event-bus signals, action-center items, and disruption follow-up.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/workflow-composer',
        label: 'Workflow Composer',
        description: 'Read-only workflow automation blueprint composer with approval chains, trigger previews, and integration routing guidance.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/ai-review',
        label: 'AI Review',
        description: 'Human-in-the-loop AI recommendation review queue with confidence, explainability, override, and approval guidance.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/decision-learning-feedback',
        label: 'Learning Feedback',
        description: 'Governed decision-intelligence feedback capture for outcomes, forecast accuracy, policy effectiveness, and optimization evidence.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ
      },
      {
        to: '/adaptive-policy-engine',
        label: 'Adaptive Policy Engine',
        description: 'Policy observation, signal evidence, effectiveness measurement, and manual learning feedback readiness.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ
      },
      {
        to: '/probabilistic-forecasting',
        label: 'Probabilistic Forecasting',
        description: 'Uncertainty-aware forecasts, calibration observations, and manual forecast feedback-loop readiness.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ
      },
      {
        to: '/cross-domain-optimization',
        label: 'Cross-Domain Optimization',
        description: 'Optimization runs, objectives, tradeoffs, and manual execution feedback-loop readiness.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ
      },
      {
        to: '/collaboration',
        label: 'Collaboration',
        description: 'Enterprise collaboration thread guidance for incidents, escalations, task coordination, and governed source-workflow comments.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/digital-twin',
        label: 'Digital Twin',
        description: 'Read-only operational topology, dependency, risk overlay, and congestion heatmap visualization sourced from the backend digital twin foundation.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ
      },
      {
        to: '/reliability-command',
        label: 'Reliability Command',
        description: 'Commercial reliability command board for readiness posture, risks, runbook planning, evidence, release packets, handoff, and closure review.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ
      },
      {
        to: '/alerts',
        label: 'Alerts',
        description: 'Review and resolve operational issues that require immediate attention.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.ALERTS_READ
      },
      {
        to: '/insights',
        label: 'Insights',
        description: 'Management intelligence for depletion risk, anomalies, supplier trust, and reorder actions.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.INSIGHTS_READ
      },
      {
        to: '/system-context',
        label: 'System Context',
        description: 'Read-only tenant context for future automation and AI decision support.',
        section: 'Command',
        permission: TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ
      }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory operations',
    items: [
      {
        to: '/products',
        label: 'Products',
        description: 'Manage inventory products, categories, barcodes, and supplier relationships.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.PRODUCTS_READ
      },
      {
        to: '/suppliers',
        label: 'Suppliers',
        description: 'Track suppliers and maintain master data used by shipments and products.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.SUPPLIERS_READ
      },
      {
        to: '/stock',
        label: 'Stock',
        description: 'View stock by product and location, with operational mutation controls.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.STOCK_READ
      },
      {
        to: '/stock-movements',
        label: 'Stock Movements',
        description: 'Trace the full movement ledger behind current stock positions.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ
      },
      {
        to: '/stock-transfers',
        label: 'Stock Transfers',
        description: 'Move stock between storage locations while preserving audit history.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.STOCK_TRANSFERS_READ
      },
      {
        to: '/storage-locations',
        label: 'Storage Locations',
        description: 'Maintain storage areas used for inventory receiving and allocation.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ
      },
      {
        to: '/scanner',
        label: 'Scanner',
        description: 'Use the device camera to scan QR codes and barcodes.',
        section: 'Inventory operations',
        permission: TENANT_PERMISSIONS.SHIPMENTS_READ
      }
    ]
  },
  {
    id: 'execution',
    label: 'Execution workflow',
    items: [
      {
        to: '/inventory-usage',
        label: 'Usage Ledger',
        description: 'Track why stock leaves the business across departments, reasons, events, and locations.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.INVENTORY_USAGE_READ
      },
      {
        to: '/inventory-requisitions',
        label: 'Requisitions',
        description: 'Request, approve, and fulfill internal department inventory demand.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ
      },
      {
        to: '/inventory-reservations',
        label: 'Reservations',
        description: 'Reserve, allocate, fulfill, release, and protect committed future stock.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ
      },
      {
        to: '/execution-requests',
        label: 'Execution Requests',
        description: 'Create, review, and govern tenant-scoped execution requests.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW
      },
      {
        to: '/execution-tasks',
        label: 'Execution Tasks',
        description: 'Coordinate operational work queues and execution task lifecycle.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.EXECUTION_TASKS_READ
      },
      {
        to: '/automation-schedules',
        label: 'Automation Schedules',
        description: 'Configure future scheduled checks. Runner is disabled and nothing executes automatically yet.',
        section: 'Execution workflow',
        permission: TENANT_PERMISSIONS.AUTOMATION_SCHEDULES_VIEW
      }
    ]
  },
  {
    id: 'procurement',
    label: 'Procurement',
    items: [
      {
        to: '/purchase-orders',
        label: 'Purchase Orders',
        description: 'Create, submit, approve, and cancel supplier purchase orders.',
        section: 'Procurement',
        permission: TENANT_PERMISSIONS.PURCHASE_ORDERS_READ
      },
      {
        to: '/procurement-recommendations',
        label: 'Procurement Recommendations',
        description: 'Turn replenishment intelligence into procurement-ready recommendation queues.',
        section: 'Procurement',
        permission: TENANT_PERMISSIONS.INSIGHTS_READ
      },
      {
        to: '/shipments',
        label: 'Shipments',
        description: 'Manage inbound shipment creation, receiving, and finalization.',
        section: 'Procurement',
        permission: TENANT_PERMISSIONS.SHIPMENTS_READ
      },
      {
        to: '/enterprise-inventory',
        label: 'Enterprise Inventory',
        description: 'Manage par levels, cycle counts, department requisitions, approvals, invoices, notifications, and labels.',
        section: 'Procurement',
        permission: TENANT_PERMISSIONS.PAR_LEVELS_READ
      }
    ]
  },
  {
    id: 'reporting',
    label: 'Reporting',
    items: [
      {
        to: '/reports',
        label: 'Reports',
        description: 'Management reporting for valuation, procurement, stock distribution, and forecast.',
        section: 'Reporting',
        permission: TENANT_PERMISSIONS.REPORTS_READ
      }
    ]
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        to: '/users',
        label: 'Users',
        description: 'Manage tenant users, their roles, and secure access lifecycle.',
        section: 'Administration',
        permission: TENANT_PERMISSIONS.USERS_READ
      },
      {
        to: '/audit',
        label: 'Audit',
        description: 'Review tenant-scoped write history and audited support-session activity.',
        section: 'Administration',
        permission: TENANT_PERMISSIONS.AUDIT_READ
      },
      {
        to: '/tenant-settings',
        label: 'Tenant Settings',
        description: 'Manage tenant-scoped settings for the current company.',
        section: 'Administration',
        permission: TENANT_PERMISSIONS.TENANT_READ
      },
      {
        to: '/admin-system',
        label: 'Admin System',
        description: 'Review system status, diagnostics, tenant control-plane data, and admin health signals.',
        section: 'Administration',
        permission: TENANT_PERMISSIONS.SYSTEM_STATUS_READ
      },
      {
        to: '/sessions',
        label: 'Sessions',
        description: 'Review active sessions and revoke stale account access.',
        section: 'Administration'
      }
    ]
  }
];

export const tenantNavigationItems = tenantNavigationSections.flatMap((section) => section.items);

export const tenantModuleRegistry: TenantModuleRegistryEntry[] = tenantNavigationSections.flatMap((section) =>
  section.items.map((item, index) => ({
    ...item,
    id: item.to.replace(/^\//, '').replace(/\//g, '-') || 'dashboard',
    moduleGroupId: section.id,
    moduleGroupLabel: section.label,
    commercialSurface: section.id as TenantModuleRegistryEntry['commercialSurface'],
    priority: section.id === 'command' || index === 0 ? 'primary' : section.id === 'administration' ? 'governance' : 'secondary',
    searchTerms: [item.label, item.description, section.label]
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  }))
);

export const tenantPrimaryModules = tenantModuleRegistry.filter((module) => module.priority === 'primary');

export function getTenantModuleForPathname(pathname: string): TenantModuleRegistryEntry | null {
  return (
    tenantModuleRegistry.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) || null
  );
}

export function getTenantModulesByGroup(moduleGroupId: string): TenantModuleRegistryEntry[] {
  return tenantModuleRegistry.filter((module) => module.moduleGroupId === moduleGroupId);
}

export function searchTenantModules(query: string): TenantModuleRegistryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return tenantModuleRegistry;
  }

  return tenantModuleRegistry.filter((module) =>
    module.searchTerms.some((term) => term.includes(normalizedQuery)) ||
    module.to.toLowerCase().includes(normalizedQuery)
  );
}

const defaultPageMeta: TenantPageMeta = {
  title: 'Inventory Management',
  subtitle: 'Frontend connected to your production-ready backend'
};

export function getTenantPageMeta(pathname: string): TenantPageMeta {
  const match = getTenantModuleForPathname(pathname);

  if (!match) {
    return defaultPageMeta;
  }

  return {
    title: match.label,
    subtitle: match.description
  };
}
