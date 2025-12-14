import express, { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/authorizationRole';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { data, error } = await supabase.from('items').select('*').eq('shop_id', shopId);
    if (error) throw error;
    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requireRole('manage_products'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { name, description, retail_price, stock, category } = req.body;

    if (!name || !retail_price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const { data, error } = await supabase
      .from('items')
      .insert([{ shop_id: shopId, name, description, retail_price, stock: stock || 0, category }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, productId } = req.params as any;
    const { data, error } = await supabase.from('items').select('*').eq('id', productId).eq('shop_id', shopId).single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:productId', authenticateToken, requireRole('manage_products'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, productId } = req.params as any;
    const { name, description, retail_price, stock, category } = req.body;
    const userId = (req as any).headers['x-user-id'];

    // Validate required fields
    if (!name || !retail_price) {
      return res.status(400).json({ success: false, error: 'Name and retail_price are required' });
    }

    // Validate price is positive
    if (retail_price < 0) {
      return res.status(400).json({ success: false, error: 'Price cannot be negative' });
    }

    // Validate stock if provided
    if (stock !== undefined && (stock < 0 || !Number.isInteger(stock))) {
      return res.status(400).json({ success: false, error: 'Stock must be a non-negative integer' });
    }

    // Get current stock for history tracking
    const { data: currentItem } = await supabase
      .from('items')
      .select('stock')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single();

    const { data, error } = await supabase
      .from('items')
      .update({ name, description, retail_price, stock, category, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;

    // Track stock changes in history
    if (stock !== undefined && currentItem && stock !== currentItem.stock) {
      const stockChange = stock - (currentItem.stock || 0);
      await supabase.from('stock_history').insert([{
        item_id: productId,
        shop_id: shopId,
        change: stockChange,
        new_stock: stock,
        reason: 'Manual adjustment',
        changed_by: userId,
        timestamp: new Date().toISOString()
      }]);
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// PUT /shops/:shopId/products/:productId/stock - Update stock with reason
router.put('/:productId/stock', authenticateToken, requireRole('manage_products'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, productId } = req.params as any;
    const { adjustment, reason } = req.body;
    const userId = (req as any).headers['x-user-id'];

    if (adjustment === undefined || adjustment === null) {
      return res.status(400).json({ success: false, error: 'Adjustment is required' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }

    if (!Number.isInteger(adjustment)) {
      return res.status(400).json({ success: false, error: 'Adjustment must be an integer' });
    }

    // Get current stock
    const { data: currentItem } = await supabase
      .from('items')
      .select('stock')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single();

    if (!currentItem) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const newStock = (currentItem.stock || 0) + adjustment;

    // Prevent negative stock
    if (newStock < 0) {
      return res.status(400).json({ success: false, error: `Cannot reduce stock below 0. Current: ${currentItem.stock}, Adjustment: ${adjustment}` });
    }

    // Update product stock
    const { data, error } = await supabase
      .from('items')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;

    // Record in history
    await supabase.from('stock_history').insert([{
      item_id: productId,
      shop_id: shopId,
      change: adjustment,
      new_stock: newStock,
      reason,
      changed_by: userId,
      timestamp: new Date().toISOString()
    }]);

    res.status(200).json({ success: true, data, previousStock: currentItem.stock, newStock });
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', authenticateToken, requireRole('manage_products'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, productId } = req.params as any;
    const { error } = await supabase.from('items').delete().eq('id', productId).eq('shop_id', shopId);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
