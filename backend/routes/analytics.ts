import express, { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router({ mergeParams: true });

// GET /shops/:shopId/analytics/overview - Get dashboard overview metrics
router.get('/overview', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { period = '30' } = req.query as any;
    const periodDays = Number(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get total orders
    const { data: orders, count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    // Get total revenue (sum of form submission values if available)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, form_submission_id')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    let totalRevenue = 0;
    if (ordersData) {
      for (const order of ordersData) {
        const { data: submission } = await supabase
          .from('form_submissions')
          .select('data')
          .eq('id', order.form_submission_id)
          .single();
        if (submission?.data?.total_price) {
          totalRevenue += Number(submission.data.total_price) || 0;
        }
      }
    }

    // Get total products
    const { count: totalProducts } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId);

    // Get total forms
    const { count: totalForms } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId);

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    res.status(200).json({
      success: true,
      data: {
        period: periodDays,
        metrics: {
          totalOrders: totalOrders || 0,
          totalRevenue,
          totalProducts: totalProducts || 0,
          totalForms: totalForms || 0,
          totalConversations: totalConversations || 0,
          averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/analytics/orders - Get order analytics
router.get('/orders', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { period = '30' } = req.query as any;
    const periodDays = Number(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get orders by status
    const { data: ordersByStatus } = await supabase
      .from('orders')
      .select('status')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    const statusCounts = {
      'Pending': 0,
      'Processing': 0,
      'Completed': 0,
      'Cancelled': 0
    };

    if (ordersByStatus) {
      for (const order of ordersByStatus) {
        const status = order.status || 'Pending';
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }
      }
    }

    // Get orders by day
    const { data: dailyOrders } = await supabase
      .from('orders')
      .select('created_at')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    const dailyCounts: { [key: string]: number } = {};
    if (dailyOrders) {
      for (const order of dailyOrders) {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        period: periodDays,
        byStatus: statusCounts,
        byDay: dailyCounts,
        total: ordersByStatus?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/analytics/products - Get product analytics
router.get('/products', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;

    // Get top products (by stock deductions)
    const { data: stockHistory } = await supabase
      .from('stock_history')
      .select('item_id, change')
      .eq('shop_id', shopId)
      .lt('change', 0)
      .order('change', { ascending: true });

    const productSales: { [key: string]: number } = {};
    if (stockHistory) {
      for (const entry of stockHistory) {
        const itemId = entry.item_id;
        productSales[itemId] = (productSales[itemId] || 0) + Math.abs(entry.change);
      }
    }

    // Get product details
    const { data: products } = await supabase
      .from('items')
      .select('id, name, stock, retail_price')
      .eq('shop_id', shopId);

    const enrichedProducts = products?.map(p => ({
      id: p.id,
      name: p.name,
      currentStock: p.stock,
      retailPrice: p.retail_price,
      unitsSold: productSales[p.id] || 0,
      estimatedRevenue: (productSales[p.id] || 0) * p.retail_price
    })) || [];

    // Sort by units sold
    enrichedProducts.sort((a, b) => b.unitsSold - a.unitsSold);

    res.status(200).json({
      success: true,
      data: {
        totalProducts: products?.length || 0,
        topProducts: enrichedProducts.slice(0, 10),
        allProducts: enrichedProducts
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/analytics/forms - Get form analytics
router.get('/forms', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;

    // Get forms with submission counts
    const { data: forms } = await supabase
      .from('forms')
      .select('id, name, created_at')
      .eq('shop_id', shopId);

    const formsWithStats = [];
    if (forms) {
      for (const form of forms) {
        const { count: submissionCount } = await supabase
          .from('form_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('form_id', form.id);

        const { count: pendingCount } = await supabase
          .from('form_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('form_id', form.id)
          .eq('status', 'Pending');

        formsWithStats.push({
          id: form.id,
          name: form.name,
          totalSubmissions: submissionCount || 0,
          pendingSubmissions: pendingCount || 0,
          completionRate: submissionCount ? ((submissionCount - (pendingCount || 0)) / submissionCount * 100).toFixed(1) : '0'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalForms: forms?.length || 0,
        forms: formsWithStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/analytics/conversations - Get conversation analytics
router.get('/conversations', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { period = '30' } = req.query as any;
    const periodDays = Number(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get conversations by status
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, status, channel, created_at')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    const statusCounts = { 'Open': 0, 'Closed': 0, 'Waiting': 0 };
    const channelCounts: { [key: string]: number } = {};

    if (conversations) {
      for (const conv of conversations) {
        const status = conv.status || 'Open';
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }
        const channel = conv.channel || 'unknown';
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      }
    }

    // Get average response time (mock for now - would need message timestamps)
    const averageResponseTime = '2h'; // Placeholder

    res.status(200).json({
      success: true,
      data: {
        period: periodDays,
        total: conversations?.length || 0,
        byStatus: statusCounts,
        byChannel: channelCounts,
        averageResponseTime
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/analytics/revenue - Get revenue analytics
router.get('/revenue', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { period = '30' } = req.query as any;
    const periodDays = Number(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get orders with revenue data
    const { data: orders } = await supabase
      .from('orders')
      .select('id, form_submission_id, created_at')
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString());

    const dailyRevenue: { [key: string]: number } = {};
    let totalRevenue = 0;

    if (orders) {
      for (const order of orders) {
        const { data: submission } = await supabase
          .from('form_submissions')
          .select('data')
          .eq('id', order.form_submission_id)
          .single();

        const amount = Number(submission?.data?.total_price) || 0;
        totalRevenue += amount;

        const date = new Date(order.created_at).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + amount;
      }
    }

    const avgDailyRevenue = periodDays > 0 ? totalRevenue / periodDays : 0;

    res.status(200).json({
      success: true,
      data: {
        period: periodDays,
        totalRevenue,
        avgDailyRevenue: avgDailyRevenue.toFixed(2),
        byDay: dailyRevenue,
        orderCount: orders?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
