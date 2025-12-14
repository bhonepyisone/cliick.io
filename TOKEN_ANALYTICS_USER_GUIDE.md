# Token Analytics Panel - User Guide

## Quick Start

### Accessing Token Analytics
1. Open Admin Panel
2. Click **"Token Analytics"** in the left navigation
3. Dashboard loads with real-time token data

---

## Dashboard Overview

### 4 Summary Cards (Top)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Messages   │  │    Tokens    │  │  API Cost    │  │  Revenue(5x) │
│   145,234    │  │   8.42M      │  │    $0.6234   │  │   $3.1170    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**What Each Shows:**
- **Messages:** Number of Gemini API calls processed
- **Tokens:** Total tokens consumed (in millions)
- **API Cost:** What you paid to Google
- **Revenue (5x):** What you earned at 5x markup (includes 80% profit)

---

## 3 Filter Options

### 1. Shop Filter
```
Select individual shop or "All Shops"
- Useful for: Analyzing specific customer usage
- Default: All Shops
```

### 2. Time Period
```
Options:
- Last 24 Hours  ← See today's activity
- Last 7 Days    ← Weekly trends
- Last 30 Days   ← Monthly patterns
- All Time       ← Historical comparison
```

### 3. Operation Type
```
Options:
- All Operations          ← Total view
- Chat Messages          ← Customer conversations
- Product Descriptions   ← AI-generated descriptions
- Photo Studio           ← Image editing operations
- Suggestions            ← AI recommendations
```

---

## 3 Main Sections

### Section 1: Cost Projections
Shows what you'll pay for different message volumes:
```
Current average: $0.000074/message

• 1,000 messages  = $0.074
• 10,000 messages = $0.74
• 100,000 messages = $7.39
```

### Section 2: Profit Margin Analysis
Shows 3 pricing scenarios:
```
2x markup:  $0.000148/msg  →  50% margin
3x markup:  $0.000222/msg  →  67% margin  
5x markup:  $0.000370/msg  →  80% margin ← RECOMMENDED
```

For each, shows:
- Per-message price
- Margin percentage (color-coded)
- Revenue & profit for 10K messages

### Section 3: Usage Breakdown Tables

#### By Operation Type
See which operations cost the most:
```
Operation               Count   Avg Cost
Chat Messages          1,245   $0.000074
Product Descriptions     342   $0.000063
Photo Studio             89    $0.000123  ← Most expensive!
Suggestions             156    $0.000042  ← Cheapest
```

#### By Shop (when "All Shops" selected)
See which customers drive the most spend:
```
Shop Name         Messages   Total Cost   Avg Cost/Msg
Premium Store       3,450    $0.2553      $0.000074
Growth Startup        892    $0.0659      $0.000074
Startup Plan          234    $0.0173      $0.000074
```

---

## Alert System

### High-Cost Operations Alert (Red)
Appears when an operation costs 50%+ above average:
```
⚠️ High-Cost Operations Detected
- Knowledge Base Heavy Query: $0.000123/msg (66% above avg)
- Long Conversation: $0.000146/msg (97% above avg)

💡 Tip: Implement caching or reduce knowledge base size
```

### Tier Recommendation Alert (Blue)
Appears when viewing individual shop:
```
🎯 Recommended Pricing Tier
┌─────────────────────────────────────┐
│ Current Usage: 450 messages         │
│ Recommended: Starter ($5/month)     │
│ Your Margin: 80% (5x markup)        │
└─────────────────────────────────────┘
```

---

## Control Buttons

### Top-Right Controls
```
[Auto-refresh ☑] [Refresh ↻] [Export CSV ⬇]
```

- **Auto-refresh:** Automatically update every 5 seconds
- **Refresh:** Manual update
- **Export CSV:** Download data for analysis

### Recent Activity Section
```
[Clear All Logs] (RED button, bottom-right)
⚠️ Use carefully - cannot be undone!
```

---

## Reading the Recent Activity Table

```
Time         Shop              Operation       Model            Input  Output  Total  Cost
14:32:15     Premium Store     Chat Messages   gemini-2.5-flash 2,062  201     2,263  $0.00007
14:31:42     Growth Startup    Product Desc    gemini-2.5-flash 1,500  150     1,650  $0.00005
14:30:18     Premium Store     Chat Messages   gemini-2.5-flash 3,200  301     3,501  $0.00010
```

**Tips:**
- Scroll down to see more history
- Green cost = normal
- Yellow/red cost = high
- Click Refresh to load latest

---

## Practical Examples

### Example 1: Find Most Expensive Operations
1. Keep "All Shops" and "All Time" selected
2. Look at "Usage by Operation Type" table
3. Sort by "Avg Cost" column (highest first)
4. Read "High-Cost Operations Detected" alert
5. Implement recommended optimizations

### Example 2: Analyze Individual Shop Performance
1. Select specific shop from "Shop" dropdown
2. Choose "Last 30 Days" period
3. Look at "Recommended Pricing Tier" blue box
4. Check if current tier matches recommendation
5. If different, consider upgrading/downgrading shop

### Example 3: Calculate Your Revenue
1. Note "API Cost" in summary card (e.g., $2.50)
2. Multiply by 5 for 5x markup: $12.50 revenue
3. Profit = $12.50 - $2.50 = $10 (80% margin)
4. For 10K messages: Use projections table

### Example 4: Monitor Cost Trends
1. Set period to "Last 7 Days"
2. Check "Total Cost" card
3. Compare with "Last 30 Days" view
4. If trending up, review recent operations
5. Consider implementing optimizations

---

## Key Metrics to Watch

### Critical Metrics
- **Avg Cost/Msg:** Should be ~$0.000074 (baseline)
- **Input/Output Ratio:** Should be ~91% input / 9% output
- **Total Cost:** Main expense driver

### Health Indicators
- ✅ Avg cost stable = good
- ⚠️ Avg cost increasing = check for expensive operations
- 🔴 Sudden spike = investigate specific shop

### Pricing Indicators
- **Current margin:** (Revenue - Cost) / Revenue × 100
- **Target margin:** 75-80% with 5x markup
- **Profit per 10K msgs:** See "Profit Margin Analysis"

---

## Optimization Tips Based on Data

### If Cost is Too High
1. Check "High-Cost Operations Detected" alert
2. Implement response caching for expensive operations
3. Trim conversation history to last 5 messages
4. Reduce knowledge base size using semantic search

### If Shop Usage is Low
1. Consider moving to "Starter" plan ($5/month, 1K msgs)
2. Offer email support instead of AI chat
3. Set token budget to prevent overspending

### If Shop Usage is High
1. Recommend upgrade to "Professional" plan ($15/month, 10K msgs)
2. Monitor for cost anomalies
3. Suggest features to increase revenue

---

## Common Questions

### Q: Why is my cost higher than expected?
**A:** 
1. Check "By Operation Type" - some operations cost 2-3x more
2. Look for long conversations (history accumulates tokens)
3. Check if large knowledge base is being used
4. Review "High-Cost Operations Detected" alert

### Q: Should I charge by message or subscription?
**A:**
1. Subscription model recommended (see PRICING_IMPLEMENTATION_GUIDE.md)
2. Starter: $5/month (1K included)
3. Professional: $15/month (10K included)
4. Enterprise: Custom pricing

### Q: What if my profit margin is low?
**A:**
1. Increase markup (3x instead of 2x)
2. Implement cost optimizations (caching, trimming)
3. Move low-usage shops to cheaper tiers
4. Review high-cost operations

### Q: How do I interpret the margin percentages?
**A:**
- 50% margin = $0.50 profit for every $1 revenue
- 67% margin = $0.67 profit for every $1 revenue
- 80% margin = $0.80 profit for every $1 revenue ← Best

### Q: Why does one shop cost more than another?
**A:**
- Using larger knowledge base (KB = 70% of cost)
- Longer conversations (history = 25% of cost)
- More complex queries (better responses = higher cost)
- Different operation types used

---

## Advanced Features

### Export Data for Analysis
1. Click "Export CSV" button
2. Opens timestamp, shop, operation, tokens, costs
3. Import into Excel/Google Sheets for pivot tables
4. Create custom reports

### Auto-Refresh for Live Monitoring
1. Check "Auto-refresh" box
2. Dashboard updates every 5 seconds
3. Good for monitoring real-time usage
4. Uncheck when not needed

### Clear Logs
1. Click "Clear All Logs" in Recent Activity
2. Confirm when prompted
3. ⚠️ Cannot be undone
4. Use only when archiving old data

---

## Dashboard Walkthrough Video Script

```
"Welcome to Token Analytics. This dashboard shows your Gemini API 
spending and profit potential.

First, we see 4 summary cards:
- Messages processed
- Total tokens consumed
- API cost (what you paid)
- Revenue at 5x markup (what you earned)

Then we have 3 filters to slice the data however you want.

The Cost Projections tell you what different volumes would cost.

The Profit Margin Analysis shows 3 pricing scenarios with real numbers.

The Usage by Operation table identifies expensive operations.

The Usage by Shop table shows customer segmentation.

Recent Activity shows a live feed of every API call.

And at the top right, you can export data or enable auto-refresh.

This dashboard gives you everything needed to:
1. Understand your API costs
2. Price your service competitively
3. Optimize expensive operations
4. Track revenue and margins
5. Make data-driven decisions"
```

---

## Need Help?

### Reference Documents
- **TOKEN_CONSUMPTION_QUICK_FACTS.txt** - Summary of costs
- **BOT_TOKEN_CONSUMPTION_REPORT.md** - Detailed analysis
- **PRICING_IMPLEMENTATION_GUIDE.md** - Pricing strategy
- **TOKEN_TRACKING_IMPLEMENTATION.md** - Technical details

### Support
For issues or questions:
1. Check this guide first
2. Review TOKEN_COST_SUMMARY.md for concepts
3. Check data in Recent Activity table
4. Verify filters are set correctly

---

**Last Updated:** December 12, 2025  
**Status:** Ready for Production Use
