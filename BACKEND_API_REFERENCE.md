# 📘 Backend API Reference

Quick reference guide for using the backend APIs.

---

## Table of Contents
1. [Inventory Operations](#inventory-operations)
2. [Analytics Operations](#analytics-operations)
3. [Admin Operations](#admin-operations)
4. [Database Direct Access](#database-direct-access)

---

## Inventory Operations

**Endpoint:** `https://your-project.supabase.co/functions/v1/inventory-operations`

### 1. Update Single Item Stock

```typescript
const response = await supabase.functions.invoke('inventory-operations', {
  body: {
    action: 'update',
    itemId: 'uuid-here',
    change: -5, // Negative for decrease, positive for increase
    reason: 'Sold 5 units',
  }
});

// Response:
{
  success: true,
  data: {
    success: true,
    item_id: 'uuid',
    previous_stock: 10,
    change: -5,
    new_stock: 5
  }
}
```

---

### 2. Process Order Stock Changes (Bulk)

```typescript
const response = await supabase.functions.invoke('inventory-operations', {
  body: {
    action: 'process_order',
    orderId: 'ORD-1234',
    shopId: 'shop-uuid',
    orderItems: [
      { item_id: 'item-uuid-1', quantity: 2 },
      { item_id: 'item-uuid-2', quantity: 1 },
    ]
  }
});

// Response:
{
  success: true,
  data: {
    success: true,
    processed: 2,
    errors: []
  }
}
```

---

### 3. Get Low Stock Items

```typescript
const response = await supabase.functions.invoke('inventory-operations', {
  body: {
    action: 'get_low_stock',
    shopId: 'shop-uuid',
    threshold: 10 // Optional, default is 10
  }
});

// Response:
{
  success: true,
  data: [
    {
      id: 'item-uuid',
      name: 'Product Name',
      stock: 5,
      category: 'Electronics',
      last_sale_date: '2025-12-08T10:30:00Z'
    }
  ]
}
```

---

## Analytics Operations

**Endpoint:** `https://your-project.supabase.co/functions/v1/analytics-operations`

### 1. Generate Daily Sales Metrics

```typescript
const response = await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'generate_daily',
    shopId: 'shop-uuid',
    date: '2025-12-08' // YYYY-MM-DD format
  }
});

// Response:
{
  success: true,
  data: {
    message: 'Daily metrics generated successfully'
  }
}
```

---

### 2. Generate Product Analytics

```typescript
const response = await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'generate_product',
    shopId: 'shop-uuid',
    date: '2025-12-08'
  }
});

// Response:
{
  success: true,
  data: {
    message: 'Product analytics generated successfully'
  }
}
```

---

### 3. Get Sales Metrics for Date Range

```typescript
const response = await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'get_metrics',
    shopId: 'shop-uuid',
    startDate: '2025-12-01',
    endDate: '2025-12-08'
  }
});

// Response:
{
  success: true,
  data: [
    {
      date: '2025-12-01',
      revenue: 150000,
      net_profit: 45000,
      orders_count: 25,
      items_sold: 50,
      avg_order_value: 6000
    },
    {
      date: '2025-12-02',
      revenue: 180000,
      net_profit: 54000,
      orders_count: 30,
      items_sold: 60,
      avg_order_value: 6000
    }
  ]
}
```

---

### 4. Get Shop Statistics

```typescript
const response = await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'get_shop_stats',
    shopId: 'shop-uuid'
  }
});

// Response:
{
  success: true,
  data: {
    total_products: 150,
    total_services: 20,
    total_orders: 500,
    total_revenue: 5000000,
    total_conversations: 1200,
    low_stock_count: 8
  }
}
```

---

## Admin Operations

**Endpoint:** `https://your-project.supabase.co/functions/v1/admin-operations`

**Note:** Requires admin privileges

### 1. Generate Platform Metrics

```typescript
const response = await supabase.functions.invoke('admin-operations', {
  body: {
    action: 'generate_platform_metrics',
    date: '2025-12-08'
  }
});

// Response:
{
  success: true,
  data: {
    message: 'Platform metrics generated successfully'
  }
}
```

---

### 2. Create Backup Snapshot

```typescript
const response = await supabase.functions.invoke('admin-operations', {
  body: {
    action: 'create_backup',
    snapshotName: 'manual_backup_2025_12_08',
    description: 'Pre-deployment backup',
    shopIds: null // null = all shops, or ['shop-uuid-1', 'shop-uuid-2']
  }
});

// Response:
{
  success: true,
  data: {
    snapshotId: 'snapshot-uuid',
    message: 'Backup created successfully'
  }
}
```

---

### 3. Cleanup Expired Snapshots

```typescript
const response = await supabase.functions.invoke('admin-operations', {
  body: {
    action: 'cleanup_snapshots'
  }
});

// Response:
{
  success: true,
  data: {
    deletedCount: 5,
    message: 'Cleanup completed successfully'
  }
}
```

---

### 4. Get Platform Statistics

```typescript
const response = await supabase.functions.invoke('admin-operations', {
  body: {
    action: 'get_platform_stats'
  }
});

// Response:
{
  success: true,
  data: [
    {
      date: '2025-12-08',
      mrr: 500000,
      platform_gmv: 10000000,
      new_users: 25,
      new_subscriptions: 10,
      active_shops: 150,
      total_shops: 200,
      total_orders: 500,
      total_conversations: 2000,
      ai_messages_processed: 5000
    }
  ]
}
```

---

## Database Direct Access

For read operations, you can query the database directly without edge functions:

### Get Shop Data

```typescript
const { data: shop, error } = await supabase
  .from('shops')
  .select(`
    *,
    items (*),
    forms (*),
    payment_methods (*),
    form_submissions (*)
  `)
  .eq('id', shopId)
  .single();
```

---

### Get Stock History

```typescript
const { data: history, error } = await supabase
  .from('stock_history')
  .select('*')
  .eq('item_id', itemId)
  .order('timestamp', { ascending: false })
  .limit(50);
```

---

### Get Daily Sales Metrics

```typescript
const { data: metrics, error } = await supabase
  .from('daily_sales_metrics')
  .select('*')
  .eq('shop_id', shopId)
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true });
```

---

### Get Product Analytics

```typescript
const { data: analytics, error } = await supabase
  .from('product_analytics')
  .select('*')
  .eq('shop_id', shopId)
  .eq('date', '2025-12-08');
```

---

### Get Low Stock Items (Direct Query)

```typescript
const { data: lowStock, error } = await supabase
  .from('items')
  .select('*')
  .eq('shop_id', shopId)
  .eq('item_type', 'product')
  .gt('stock', 0)
  .lte('stock', 10)
  .order('stock', { ascending: true });
```

---

### Get Orders by Status

```typescript
const { data: orders, error } = await supabase
  .from('form_submissions')
  .select('*')
  .eq('shop_id', shopId)
  .eq('status', 'Pending')
  .order('submitted_at', { ascending: false });
```

---

### Get Conversations

```typescript
const { data: conversations, error } = await supabase
  .from('conversations')
  .select(`
    *,
    messages (
      id,
      sender,
      text,
      timestamp
    )
  `)
  .eq('shop_id', shopId)
  .eq('is_live', true)
  .order('last_message_at', { ascending: false });
```

---

## Real-time Subscriptions

### Subscribe to Stock Changes

```typescript
const stockChannel = supabase
  .channel('stock-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'items',
      filter: `shop_id=eq.${shopId}`
    },
    (payload) => {
      console.log('Stock updated:', payload.new);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
stockChannel.unsubscribe();
```

---

### Subscribe to New Orders

```typescript
const ordersChannel = supabase
  .channel('new-orders')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'form_submissions',
      filter: `shop_id=eq.${shopId}`
    },
    (payload) => {
      console.log('New order:', payload.new);
      // Show notification
    }
  )
  .subscribe();
```

---

### Subscribe to Messages

```typescript
const messagesChannel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      // Update chat UI
    }
  )
  .subscribe();
```

---

## Error Handling

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { /* result data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Handling Errors

```typescript
const response = await supabase.functions.invoke('inventory-operations', {
  body: { /* ... */ }
});

if (response.error) {
  console.error('Edge function error:', response.error);
  return;
}

const { success, data, error } = response.data;

if (!success) {
  console.error('API error:', error);
  return;
}

// Use data
console.log('Success:', data);
```

---

## Common Patterns

### Update Stock After Order

```typescript
// When order is completed
const processStockResult = await supabase.functions.invoke('inventory-operations', {
  body: {
    action: 'process_order',
    orderId: submission.submission_id,
    shopId: submission.shop_id,
    orderItems: submission.ordered_products.map(item => ({
      item_id: item.productId,
      quantity: item.quantity
    }))
  }
});

if (!processStockResult.data.success) {
  // Handle insufficient stock
  console.error('Stock update failed:', processStockResult.data.data.errors);
}
```

---

### Daily Analytics Generation

```typescript
// Generate analytics for yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0];

// Generate sales metrics
await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'generate_daily',
    shopId: shopId,
    date: dateStr
  }
});

// Generate product analytics
await supabase.functions.invoke('analytics-operations', {
  body: {
    action: 'generate_product',
    shopId: shopId,
    date: dateStr
  }
});
```

---

### Dashboard Data Loading

```typescript
async function loadDashboardData(shopId: string, startDate: string, endDate: string) {
  // Get pre-aggregated metrics
  const { data: metrics } = await supabase.functions.invoke('analytics-operations', {
    body: {
      action: 'get_metrics',
      shopId,
      startDate,
      endDate
    }
  });

  // Get shop stats
  const { data: stats } = await supabase.functions.invoke('analytics-operations', {
    body: {
      action: 'get_shop_stats',
      shopId
    }
  });

  // Get low stock items
  const { data: lowStock } = await supabase.functions.invoke('inventory-operations', {
    body: {
      action: 'get_low_stock',
      shopId,
      threshold: 10
    }
  });

  return {
    metrics: metrics.data,
    stats: stats.data,
    lowStock: lowStock.data
  };
}
```

---

## Performance Tips

1. **Use Pre-Aggregated Data:** Query `daily_sales_metrics` instead of calculating from raw orders
2. **Enable Caching:** Cache dashboard data for 5-10 minutes
3. **Use Pagination:** For large datasets, use `.range(start, end)`
4. **Limit Results:** Always use `.limit()` when possible
5. **Use Indexes:** Queries on indexed columns (shop_id, date, status) are fast
6. **Real-time Only When Needed:** Don't subscribe to channels you don't actively display

---

**Need more help?** See [`BACKEND_SETUP_GUIDE.md`](./BACKEND_SETUP_GUIDE.md) for deployment instructions.
