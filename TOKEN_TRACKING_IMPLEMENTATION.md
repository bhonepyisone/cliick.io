# 🔧 Token Tracking Implementation Details

## Overview

Your codebase already has comprehensive token tracking implemented. This document explains how to leverage it for pricing decisions.

---

## Current Implementation

### 1. Token Tracker (`utils/tokenTracker.ts`)

**Purpose:** Logs all Gemini API token consumption

**Key Methods:**

```typescript
// Log usage from any API call
tokenTracker.logUsage({
  shopId: 'shop_123',
  userId: 'user_456',
  conversationId: 'conv_789',
  operationType: 'chat_message', // or 'product_description', 'photo_studio', 'suggestion'
  modelName: 'gemini-2.5-flash',
  inputTokens: 2062,
  outputTokens: 201,
  metadata: {
    messageLength: 50,
    historyLength: 5,
    knowledgeBaseSize: 1500,
  }
});

// Retrieve logs
const allLogs = tokenTracker.getLogs();
const shopLogs = tokenTracker.getLogsByShop('shop_123');
const csvExport = tokenTracker.exportToCSV();

// Get statistics
const stats = tokenTracker.getStatistics();
// Returns: { totalTokens, totalCost, avgCost, byOperationType, byShop }
```

**Pricing Configuration:**

```typescript
// Current pricing in tokenTracker.ts (line 40-48)
const DEFAULT_PRICING = {
  'gemini-2.5-flash': {
    inputPricePerMillion: 0.03,
    outputPricePerMillion: 0.06,
  },
  'gemini-2.5-pro': {
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 10.00,
  },
};

// To update pricing dynamically:
tokenTracker.updatePricing('gemini-2.5-flash', {
  inputPricePerMillion: 0.03,
  outputPricePerMillion: 0.06,
});
```

### 2. Token Limiter (`utils/tokenLimiter.ts`)

**Purpose:** Prevents excessive token consumption

**Current Limits:**

```typescript
const DEFAULT_LIMITS = {
  chat_message: {
    maxInputTokensPerMessage: 10000,
    maxOutputTokensPerMessage: 2000,
    maxTotalTokensPerMessage: 12000,
    maxDailyCost: 5.00,        // $5 per shop per day
    maxMonthlyCost: 100.00,    // $100 per shop per month
    alertThreshold: 80,        // Alert at 80% usage
  },
  // ... other operation types
};

// Usage:
const violation = tokenLimiter.checkMessageLimits(
  'chat_message',
  inputTokens,
  outputTokens
);

if (violation) {
  console.warn('Limit violation:', violation.message);
}
```

**Recommendation:** These limits are GOOD for your use case. Keep or adjust based on pricing tiers.

### 3. Token Budget Service (`services/tokenBudgetService.ts`)

**Purpose:** Manage per-shop token budgets

**Current Implementation:**

```typescript
// Check if shop can make request
const budgetCheck = await tokenBudgetService.canMakeRequest(shopId);
if (!budgetCheck.allowed) {
  return { text: 'Budget exceeded', orderId: undefined };
}

// Apply cost optimization
const optimization = await tokenBudgetService.applyOptimization(
  shopId,
  'chat_message',
  { modelName, historyLength }
);

if (optimization.optimized) {
  // Use optimized model or trim history
  modelName = optimization.modelName;
}
```

---

## Implementing Pricing Integration

### Step 1: Add Pricing Tiers to Database

```sql
-- Create pricing tiers table
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
  monthly_fee DECIMAL(10, 2) NOT NULL,
  included_messages INTEGER NOT NULL,
  overage_rate DECIMAL(10, 8) NOT NULL, -- per message
  max_monthly_spend DECIMAL(10, 2), -- NULL = unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tier assignment to shops
ALTER TABLE shops ADD COLUMN pricing_tier TEXT DEFAULT 'starter';
ALTER TABLE shops ADD CONSTRAINT fk_pricing_tier 
  FOREIGN KEY (pricing_tier) REFERENCES pricing_tiers(tier_name);

-- Track billing records
CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  billing_period DATE NOT NULL,
  tier_name TEXT NOT NULL,
  messages_used INTEGER NOT NULL,
  tokens_used BIGINT NOT NULL,
  api_cost DECIMAL(10, 8) NOT NULL,
  base_charge DECIMAL(10, 2) NOT NULL,
  overage_charge DECIMAL(10, 2) NOT NULL,
  total_charge DECIMAL(10, 2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, billing_period)
);

-- Create index for faster queries
CREATE INDEX idx_billing_shop_period ON billing_records(shop_id, billing_period);
```

### Step 2: Create Pricing Service

```typescript
// services/pricingService.ts

import { supabase } from '../supabase/client';

export interface PricingTier {
  tier_name: string;
  monthly_fee: number;
  included_messages: number;
  overage_rate: number;
  max_monthly_spend: number | null;
}

export interface BillingRecord {
  shop_id: string;
  billing_period: Date;
  tier_name: string;
  messages_used: number;
  tokens_used: number;
  api_cost: number;
  base_charge: number;
  overage_charge: number;
  total_charge: number;
  paid: boolean;
}

class PricingService {
  private pricingTiers: Map<string, PricingTier> = new Map();

  constructor() {
    this.loadPricingTiers();
  }

  async loadPricingTiers(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*');

      if (error) throw error;

      data?.forEach(tier => {
        this.pricingTiers.set(tier.tier_name, tier);
      });
    } catch (error) {
      console.error('Failed to load pricing tiers:', error);
      // Load defaults
      this.loadDefaultTiers();
    }
  }

  private loadDefaultTiers(): void {
    this.pricingTiers.set('starter', {
      tier_name: 'starter',
      monthly_fee: 5.00,
      included_messages: 1000,
      overage_rate: 0.00015,
      max_monthly_spend: 50.00,
    });

    this.pricingTiers.set('professional', {
      tier_name: 'professional',
      monthly_fee: 15.00,
      included_messages: 10000,
      overage_rate: 0.00010,
      max_monthly_spend: 200.00,
    });

    this.pricingTiers.set('enterprise', {
      tier_name: 'enterprise',
      monthly_fee: 0, // Custom
      included_messages: Infinity,
      overage_rate: 0.00005,
      max_monthly_spend: null,
    });
  }

  /**
   * Calculate monthly charge for a shop
   */
  calculateMonthlyCharge(
    tier: string,
    messagesUsed: number
  ): { baseCharge: number; overageCharge: number; totalCharge: number } {
    const tierConfig = this.pricingTiers.get(tier);
    if (!tierConfig) {
      throw new Error(`Unknown pricing tier: ${tier}`);
    }

    let baseCharge = tierConfig.monthly_fee;
    let overageCharge = 0;

    // Calculate overage if any
    if (messagesUsed > tierConfig.included_messages) {
      const overageMessages = messagesUsed - tierConfig.included_messages;
      overageCharge = overageMessages * tierConfig.overage_rate;
    }

    let totalCharge = baseCharge + overageCharge;

    // Apply cap if exists
    if (tierConfig.max_monthly_spend && totalCharge > tierConfig.max_monthly_spend) {
      totalCharge = tierConfig.max_monthly_spend;
    }

    return { baseCharge, overageCharge, totalCharge };
  }

  /**
   * Generate monthly billing record
   */
  async generateMonthlyBilling(
    shopId: string,
    billingPeriod: Date
  ): Promise<BillingRecord> {
    // Get usage stats for the period
    const { data: usage, error } = await supabase
      .from('token_usage_logs')
      .select('input_tokens, output_tokens, total_tokens, total_cost')
      .eq('shop_id', shopId)
      .gte('created_at', this.getMonthStart(billingPeriod).toISOString())
      .lt('created_at', this.getMonthEnd(billingPeriod).toISOString());

    if (error) throw error;

    // Aggregate usage
    const messagesUsed = usage?.length ?? 0;
    const tokensUsed = usage?.reduce((sum, log) => sum + log.total_tokens, 0) ?? 0;
    const apiCost = usage?.reduce((sum, log) => sum + log.total_cost, 0) ?? 0;

    // Get shop's current tier
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('pricing_tier')
      .eq('id', shopId)
      .single();

    if (shopError) throw shopError;

    const tier = shop?.pricing_tier ?? 'starter';

    // Calculate charges
    const { baseCharge, overageCharge, totalCharge } = this.calculateMonthlyCharge(
      tier,
      messagesUsed
    );

    // Store billing record
    const { data: record, error: insertError } = await supabase
      .from('billing_records')
      .insert({
        shop_id: shopId,
        billing_period: billingPeriod,
        tier_name: tier,
        messages_used: messagesUsed,
        tokens_used: tokensUsed,
        api_cost: apiCost,
        base_charge: baseCharge,
        overage_charge: overageCharge,
        total_charge: totalCharge,
        paid: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return record;
  }

  /**
   * Get recommended tier based on usage
   */
  getRecommendedTier(messagesPerMonth: number): string {
    if (messagesPerMonth <= 1000) return 'starter';
    if (messagesPerMonth <= 10000) return 'professional';
    return 'enterprise';
  }

  /**
   * Calculate cost savings if upgraded
   */
  calculateUpgradeSavings(
    currentTier: string,
    messagesUsed: number
  ): { recommendedTier: string; savings: number } {
    const recommended = this.getRecommendedTier(messagesUsed);
    if (recommended === currentTier) {
      return { recommendedTier: recommended, savings: 0 };
    }

    const { totalCharge: currentCost } = this.calculateMonthlyCharge(currentTier, messagesUsed);
    const { totalCharge: recommendedCost } = this.calculateMonthlyCharge(recommended, messagesUsed);
    const savings = currentCost - recommendedCost;

    return { recommendedTier: recommended, savings: Math.max(0, savings) };
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
}

export const pricingService = new PricingService();
```

### Step 3: Add Pricing to Frontend Hooks

```typescript
// hooks/usePricing.ts

import { useCallback, useState, useEffect } from 'react';
import { pricingService } from '../services/pricingService';

export function usePricing(shopId: string) {
  const [tier, setTier] = useState<string>('starter');
  const [monthlyUsage, setMonthlyUsage] = useState<number>(0);
  const [monthlyCost, setMonthlyCost] = useState<number>(0);
  const [recommendedTier, setRecommendedTier] = useState<string>('starter');
  const [savings, setSavings] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPricingInfo = async () => {
      try {
        // Load current usage
        const logs = await tokenTracker.getLogsByShop(shopId);
        const usage = logs.filter(
          log => new Date(log.timestamp).getMonth() === new Date().getMonth()
        ).length;

        setMonthlyUsage(usage);

        // Calculate cost
        const { totalCharge } = pricingService.calculateMonthlyCharge(tier, usage);
        setMonthlyCost(totalCharge);

        // Get recommendation
        const { recommendedTier: recommended, savings: savingsAmount } =
          pricingService.calculateUpgradeSavings(tier, usage);

        setRecommendedTier(recommended);
        setSavings(savingsAmount);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load pricing info:', error);
        setLoading(false);
      }
    };

    loadPricingInfo();
  }, [shopId, tier]);

  const handleUpgradeTier = useCallback(async (newTier: string) => {
    try {
      await api.updateShop(shopId, { pricing_tier: newTier });
      setTier(newTier);
    } catch (error) {
      console.error('Failed to upgrade tier:', error);
    }
  }, [shopId]);

  return {
    tier,
    monthlyUsage,
    monthlyCost,
    recommendedTier,
    savings,
    loading,
    handleUpgradeTier,
  };
}
```

### Step 4: Display Pricing in Dashboard

```typescript
// components/PricingPanel.tsx

import { usePricing } from '../hooks/usePricing';

export function PricingPanel({ shop }) {
  const {
    tier,
    monthlyUsage,
    monthlyCost,
    recommendedTier,
    savings,
    loading,
    handleUpgradeTier,
  } = usePricing(shop.id);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">AI Usage & Billing</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-sm text-gray-600">Current Plan</div>
          <div className="text-2xl font-bold capitalize">{tier}</div>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <div className="text-sm text-gray-600">Messages This Month</div>
          <div className="text-2xl font-bold">{monthlyUsage}</div>
        </div>

        <div className="bg-purple-50 p-4 rounded">
          <div className="text-sm text-gray-600">Estimated Bill</div>
          <div className="text-2xl font-bold">${monthlyCost.toFixed(2)}</div>
        </div>
      </div>

      {recommendedTier !== tier && savings > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="font-semibold text-yellow-800">
            💡 Switch to {recommendedTier} plan to save ${savings.toFixed(2)}/month
          </p>
          <button
            onClick={() => handleUpgradeTier(recommendedTier)}
            className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Available Plans</h3>

        {['starter', 'professional', 'enterprise'].map(planTier => (
          <div
            key={planTier}
            className={`border p-4 rounded cursor-pointer ${
              tier === planTier ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => handleUpgradeTier(planTier)}
          >
            <div className="font-semibold capitalize mb-2">{planTier}</div>
            <div className="text-sm text-gray-600">
              {planTier === 'starter' && '$5/month, 1K messages'}
              {planTier === 'professional' && '$15/month, 10K messages'}
              {planTier === 'enterprise' && 'Custom pricing'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Querying Usage Data

### Get Monthly Summary by Shop

```sql
SELECT
  shop_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as message_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as api_cost,
  AVG(total_tokens) as avg_tokens_per_msg,
  AVG(total_cost) as avg_cost_per_msg
FROM token_usage_logs
GROUP BY shop_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC, api_cost DESC;
```

### Identify High-Cost Shops

```sql
SELECT
  shop_id,
  COUNT(*) as messages_today,
  SUM(total_tokens) as tokens_today,
  SUM(total_cost) as cost_today,
  ROUND(SUM(total_cost) * 30::numeric, 2) as projected_monthly_cost
FROM token_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY shop_id
HAVING SUM(total_cost) > 1.00  -- Cost > $1 today
ORDER BY cost_today DESC
LIMIT 20;
```

### Calculate Projected Month-end Costs

```sql
SELECT
  shop_id,
  (SELECT COUNT(*) FROM token_usage_logs t2 
   WHERE t2.shop_id = t1.shop_id 
   AND t2.created_at >= DATE_TRUNC('month', NOW())) as messages_this_month,
  ROUND((SELECT SUM(total_cost) FROM token_usage_logs t2 
         WHERE t2.shop_id = t1.shop_id 
         AND t2.created_at >= DATE_TRUNC('month', NOW()))::numeric * 
        (DATE_PART('days', DATE_TRUNC('month', NOW() + INTERVAL '1 month') - NOW()) /
         GREATEST(1, EXTRACT(DAY FROM NOW()))::numeric), 2) as projected_month_cost
FROM token_usage_logs t1
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY shop_id
ORDER BY projected_month_cost DESC;
```

---

## Monitoring & Alerts

### Set Up Daily Alert for High Costs

```typescript
// services/alertService.ts

async function checkDailyTokenCosts() {
  const { data: costData, error } = await supabase.rpc('get_high_cost_shops', {
    cost_threshold: 5.00, // Alert if > $5 today
  });

  if (error) {
    console.error('Failed to check costs:', error);
    return;
  }

  for (const shop of costData) {
    // Send email to shop owner
    await sendEmail({
      to: shop.owner_email,
      subject: `⚠️ High AI Usage Alert - ${shop.name}`,
      template: 'high_usage_alert',
      data: {
        shopName: shop.name,
        todayCost: shop.cost_today,
        projectedMonthlyCost: shop.projected_monthly_cost,
        recommendedTier: shop.recommended_tier,
      },
    });

    // Log alert in database
    await supabase.from('usage_alerts').insert({
      shop_id: shop.id,
      alert_type: 'high_daily_cost',
      threshold: 5.00,
      actual_cost: shop.cost_today,
      created_at: new Date().toISOString(),
    });
  }
}

// Run daily at 2 AM
schedule.scheduleJob('0 2 * * *', checkDailyTokenCosts);
```

---

## Reporting & Analytics

### Generate Monthly Billing Report

```typescript
async function generateMonthlyBillingReport(month: Date) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const { data: logs, error } = await supabase
    .from('token_usage_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString());

  if (error) throw error;

  const summary = {
    period: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
    totalMessages: logs?.length ?? 0,
    totalTokens: logs?.reduce((sum, log) => sum + log.total_tokens, 0) ?? 0,
    totalCost: logs?.reduce((sum, log) => sum + log.total_cost, 0) ?? 0,
    byOperation: {},
    byShop: {},
  };

  // Aggregate by operation type
  logs?.forEach(log => {
    if (!summary.byOperation[log.operation_type]) {
      summary.byOperation[log.operation_type] = {
        count: 0,
        cost: 0,
        tokens: 0,
      };
    }
    summary.byOperation[log.operation_type].count++;
    summary.byOperation[log.operation_type].cost += log.total_cost;
    summary.byOperation[log.operation_type].tokens += log.total_tokens;
  });

  // Aggregate by shop
  logs?.forEach(log => {
    if (!summary.byShop[log.shop_id]) {
      summary.byShop[log.shop_id] = { count: 0, cost: 0 };
    }
    summary.byShop[log.shop_id].count++;
    summary.byShop[log.shop_id].cost += log.total_cost;
  });

  return summary;
}
```

---

## Testing Token Tracking

### Run Test Suite

```bash
cd backend
npm run test:tokens
```

This will test all 10 scenarios and show actual Gemini API token consumption.

### Verify Tracking

```typescript
// In your test files
import { tokenTracker } from '../utils/tokenTracker';

test('tracks token usage correctly', async () => {
  const initialCount = tokenTracker.getLogs().length;
  
  // Make API call
  await generateChatResponse(...);
  
  const finalCount = tokenTracker.getLogs().length;
  expect(finalCount).toBe(initialCount + 1);
  
  const latestLog = tokenTracker.getLogs().pop();
  expect(latestLog.inputTokens).toBeGreaterThan(0);
  expect(latestLog.outputTokens).toBeGreaterThan(0);
  expect(latestLog.totalCost).toBeGreaterThan(0);
});
```

---

## Summary

Your codebase has **excellent token tracking** already in place:
- ✅ `tokenTracker.ts` - Logs all usage
- ✅ `tokenLimiter.ts` - Enforces safety limits
- ✅ `tokenBudgetService.ts` - Manages per-shop budgets

To implement pricing:
1. Add pricing tiers to database
2. Create PricingService
3. Generate monthly billing records
4. Display in dashboard
5. Set up alerts for high usage

All components are ready. Just need to wire them together!
