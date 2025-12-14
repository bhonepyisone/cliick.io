import { Role } from '../types';

// Permission matrix: which roles can access which features
export const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  [Role.OWNER]: new Set([
    'view_dashboard',
    'view_inbox',
    'view_live_chat',
    'view_products',
    'manage_products',
    'view_orders',
    'manage_orders',
    'view_accountant',
    'manage_accountant',
    'view_settings',
    'manage_settings',
    'manage_team',
    'manage_subscription',
    'view_billing_history',
    'manage_integrations',
    'delete_shop',
  ]),
  [Role.ADMIN]: new Set([
    'view_dashboard',
    'view_inbox',
    'view_live_chat',
    'view_products',
    'manage_products',
    'view_orders',
    'manage_orders',
    'view_accountant',
    'manage_accountant',
    'view_settings',
    'manage_settings',
    'manage_team', // Admin can manage team but with restrictions (can't assign ADMIN role)
    'manage_integrations',
    // Notably missing: manage_subscription, delete_shop
  ]),
  [Role.ORDER_MANAGER]: new Set([
    'view_dashboard',
    'view_inbox',
    'view_live_chat',
    'view_products',
    'manage_products',
    'view_orders',
    'manage_orders',
    'view_settings',
    'manage_settings',
    // Missing: view_accountant, manage_accountant, manage_team, manage_integrations
  ]),
  [Role.SUPPORT_AGENT]: new Set([
    'view_dashboard',
    'view_inbox',
    'view_live_chat',
    'view_orders',
    'manage_orders',
    'view_settings',
    // Missing: manage_products, view_accountant, manage_settings, manage_team
  ]),
};

// Tab access matrix
export const TAB_ACCESS: Record<string, Role[]> = {
  'dashboard': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
  'inbox': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
  'live_chat': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
  'products': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER],
  'manage_order': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
  'accountant': [Role.OWNER, Role.ADMIN],
  'settings': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
};

// Settings sub-tabs access matrix
export const SETTINGS_TAB_ACCESS: Record<string, Role[]> = {
  'my_account': [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT],
  'subscription': [Role.OWNER],
  'billing_history': [Role.OWNER],
  'shop_settings': [Role.OWNER, Role.ADMIN],
  'integrations': [Role.OWNER, Role.ADMIN],
  'team_management': [Role.OWNER, Role.ADMIN],
};

/**
 * Check if a role has permission to perform an action
 */
export const hasPermission = (role: Role | null, permission: string): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
};

/**
 * Check if a role can access a tab
 */
export const canAccessTab = (role: Role | null, tabId: string): boolean => {
  if (!role) return false;
  const allowedRoles = TAB_ACCESS[tabId];
  return allowedRoles ? allowedRoles.includes(role) : false;
};

/**
 * Check if a role can access a settings sub-tab
 */
export const canAccessSettingsTab = (role: Role | null, settingsTabId: string): boolean => {
  if (!role) return false;
  const allowedRoles = SETTINGS_TAB_ACCESS[settingsTabId];
  return allowedRoles ? allowedRoles.includes(role) : false;
};

/**
 * Check if a role is OWNER
 */
export const isOwner = (role: Role | null): boolean => {
  return role === Role.OWNER;
};

/**
 * Check if a role is ADMIN or higher
 */
export const isAdminOrHigher = (role: Role | null): boolean => {
  return role === Role.OWNER || role === Role.ADMIN;
};

/**
 * Get all permissions for a role
 */
export const getPermissionsForRole = (role: Role | null): string[] => {
  if (!role) return [];
  return Array.from(ROLE_PERMISSIONS[role] ?? new Set());
};
