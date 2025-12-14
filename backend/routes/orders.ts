import express, { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/authorizationRole';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { data, error } = await supabase.from('orders').select('*').eq('shop_id', shopId);
    if (error) throw error;
    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requireRole('manage_orders'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { form_submission_id, items, status } = req.body;
    const userId = (req as any).headers['x-user-id'];

    if (!form_submission_id) {
      return res.status(400).json({ success: false, error: 'Form submission ID is required' });
    }

    // Create the order
    const { data, error } = await supabase
      .from('orders')
      .insert([{ shop_id: shopId, form_submission_id, status: status || 'Pending' }])
      .select()
      .single();

    if (error) throw error;

    // Auto-deduct inventory if items provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_id, quantity } = item;
        if (!product_id || !quantity || quantity <= 0) continue;

        // Get current stock
        const { data: currentItem } = await supabase
          .from('items')
          .select('stock')
          .eq('id', product_id)
          .eq('shop_id', shopId)
          .single();

        if (currentItem) {
          const currentStock = currentItem.stock || 0;
          const newStock = Math.max(0, currentStock - quantity);

          // Update stock
          await supabase
            .from('items')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', product_id)
            .eq('shop_id', shopId);

          // Record in history
          await supabase.from('stock_history').insert([{
            item_id: product_id,
            shop_id: shopId,
            change: -quantity,
            new_stock: newStock,
            reason: `Order #${data.id}`,
            changed_by: userId,
            timestamp: new Date().toISOString()
          }]);
        }
      }
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, orderId } = req.params as any;
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).eq('shop_id', shopId).single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:orderId/status', authenticateToken, requireRole('manage_orders'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, orderId } = req.params as any;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:orderId', authenticateToken, requireRole('manage_orders'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, orderId } = req.params as any;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:orderId', authenticateToken, requireRole('manage_orders'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, orderId } = req.params as any;
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('shop_id', shopId);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
