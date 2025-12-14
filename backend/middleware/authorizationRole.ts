import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export type TeamRole = 'Owner' | 'Admin' | 'Order Manager' | 'Support Agent';

// Permission map: which roles can perform which actions
const ROLE_PERMISSIONS: Record<TeamRole, Set<string>> = {
  'Owner': new Set([
    'manage_products',
    'manage_orders',
    'manage_team',
    'view_accountant',
    'manage_subscription',
    'manage_integrations',
    'delete_shop',
  ]),
  'Admin': new Set([
    'manage_products',
    'manage_orders',
    'manage_team', // Admin can manage team but with frontend restrictions
    'view_accountant',
    'manage_integrations',
  ]),
  'Order Manager': new Set([
    'manage_products',
    'manage_orders',
  ]),
  'Support Agent': new Set([
    'manage_orders',
  ]),
};

/**
 * Middleware to check if user has role-based permission for an action
 * Usage: router.post('/products', requireRole('manage_products'), handler)
 */
export const requireRole = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).headers['x-user-id'];
      const shopId = req.body.shopId || req.params.shopId || req.query.shopId;

      if (!userId || !shopId) {
        return res.status(400).json({ success: false, error: 'Missing userId or shopId' });
      }

      // Get the shop to check owner
      const { data: shop } = await supabase
        .from('shops')
        .select('id, owner_id')
        .eq('id', shopId)
        .single();

      if (!shop) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      // Owners can always perform any action
      if (shop.owner_id === userId) {
        return next();
      }

      // Check if user is a team member and has the required role
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('shop_id', shopId)
        .eq('user_id', userId)
        .single();

      if (!teamMember) {
        return res.status(403).json({ success: false, error: 'You do not have access to this shop' });
      }

      const userRole = teamMember.role as TeamRole;
      const permissions = ROLE_PERMISSIONS[userRole];

      if (!permissions || !permissions.has(action)) {
        return res.status(403).json({ 
          success: false, 
          error: `Your role (${userRole}) does not have permission to ${action}` 
        });
      }

      // Attach role to request for logging/auditing
      (req as any).userRole = userRole;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check if user is the shop owner
 */
export const requireOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).headers['x-user-id'];
    const shopId = req.body.shopId || req.params.shopId || req.query.shopId;

    if (!userId || !shopId) {
      return res.status(400).json({ success: false, error: 'Missing userId or shopId' });
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    if (shop.owner_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the shop owner can perform this action' });
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json({ success: false, error: 'Owner check failed' });
  }
};

/**
 * Middleware to check if user is admin or owner
 */
export const requireAdminOrOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).headers['x-user-id'];
    const shopId = req.body.shopId || req.params.shopId || req.query.shopId;

    if (!userId || !shopId) {
      return res.status(400).json({ success: false, error: 'Missing userId or shopId' });
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Owner check
    if (shop.owner_id === userId) {
      return next();
    }

    // Team member check
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .single();

    if (!teamMember) {
      return res.status(403).json({ success: false, error: 'You do not have access to this shop' });
    }

    const userRole = teamMember.role as TeamRole;
    if (userRole !== 'Admin' && userRole !== 'Owner') {
      return res.status(403).json({ success: false, error: 'Only owners and admins can perform this action' });
    }

    (req as any).userRole = userRole;
    next();
  } catch (error) {
    console.error('Admin/Owner check error:', error);
    res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
};

/**
 * Get user's role for a shop
 */
export const getUserRoleForShop = async (userId: string, shopId: string): Promise<TeamRole | 'Owner' | null> => {
  try {
    // Check if owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (shop?.owner_id === userId) {
      return 'Owner';
    }

    // Check team members
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .single();

    return teamMember?.role as TeamRole || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};
