# 🔐 Role System & Permissions Documentation

**Date:** December 8, 2025  
**Project:** Cliick.io AI Studio  
**Status:** Comprehensive Role-Based Access Control (RBAC) System

---

## 📊 Overview

The application has **TWO separate role systems**:

1. **Team/Shop Roles** - Control access within individual shops (4 roles)
2. **Platform Admin Role** - Control access to platform-wide settings (TODO - needs implementation)

---

## 👥 PART 1: Team/Shop Roles (IMPLEMENTED)

### **4 Team Roles Available:**

```typescript
export enum Role {
    OWNER = 'Owner',
    ADMIN = 'Admin',
    ORDER_MANAGER = 'Order Manager',
    SUPPORT_AGENT = 'Support Agent',
}
```

### **Database Schema:**

```sql
-- Team role enum
CREATE TYPE team_role AS ENUM (
    'Owner', 
    'Admin', 
    'Order Manager', 
    'Support Agent'
);

-- Team members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    shop_id UUID REFERENCES shops(id),
    user_id UUID REFERENCES profiles(id),
    role team_role NOT NULL DEFAULT 'Support Agent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, user_id)
);
```

---

## 🎯 Role Hierarchy & Permissions

### **1️⃣ OWNER (Highest Authority)**

**Description:** Shop creator with full control over the shop and team.

**Key Permissions:**
- ✅ Full access to ALL features
- ✅ Manage team members (invite, remove, change roles)
- ✅ Delete shop
- ✅ Access all tabs and settings
- ✅ View financial data (Accountant panel)
- ✅ Modify products, inventory, pricing
- ✅ Configure integrations
- ✅ Manage subscriptions and billing
- ✅ Access sales dashboard with AI suggestions
- ✅ Configure payment methods
- ✅ Manage live chat and conversations
- ✅ Create and edit forms
- ✅ Configure automations

**Database:**
- Owner is NOT in `team_members` table
- Owner is identified by `shops.owner_id = user.id`

**Row Level Security (RLS):**
```sql
-- Owners can access their shops
SELECT id FROM shops WHERE owner_id = auth.uid()
```

---

### **2️⃣ ADMIN (Second-Highest Authority)**

**Description:** Trusted team member with almost all owner privileges except team management.

**Key Permissions:**
- ✅ Access all tabs except team management
- ✅ View financial data (Accountant panel)
- ✅ Modify products, inventory, pricing
- ✅ Access sales dashboard
- ✅ Configure shop settings
- ✅ Manage live chat
- ✅ Create and edit forms
- ✅ Configure automations
- ✅ Access integrations panel
- ❌ **CANNOT** invite/remove team members
- ❌ **CANNOT** delete shop
- ❌ **CANNOT** change other members' roles

**Tab Access:**
```typescript
// From App.tsx navigation
{ id: 'live_chat', roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] }
{ id: 'products', roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER] }
{ id: 'manage_order', roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] }
{ id: 'accountant', roles: [Role.OWNER, Role.ADMIN] } // Financial access
{ id: 'settings', roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] }
```

**Database RLS:**
```sql
-- Admins can modify items
CREATE POLICY "Shop owners/admins can modify items" ON items FOR ALL 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
        )
    );
```

---

### **3️⃣ ORDER_MANAGER (Operational Role)**

**Description:** Team member focused on order management and customer service.

**Key Permissions:**
- ✅ Access live chat
- ✅ Access sales assistant (order management)
- ✅ View and edit products
- ✅ Process orders and bookings
- ✅ Access settings panel
- ✅ Manage inventory
- ❌ **CANNOT** access Accountant panel (no financial data)
- ❌ **CANNOT** delete shop
- ❌ **CANNOT** manage team
- ❌ **CANNOT** modify integrations

**Tab Access:**
```typescript
{ id: 'live_chat', roles: [..., Role.ORDER_MANAGER] }
{ id: 'products', roles: [..., Role.ORDER_MANAGER] }
{ id: 'manage_order', roles: [..., Role.ORDER_MANAGER] }
{ id: 'settings', roles: [..., Role.ORDER_MANAGER] }
// NO access to 'accountant' tab
```

**Use Cases:**
- Customer support representatives
- Order processing staff
- Inventory managers

---

### **4️⃣ SUPPORT_AGENT (Lowest Authority)**

**Description:** Team member focused purely on customer interactions.

**Key Permissions:**
- ✅ Access live chat
- ✅ Access sales assistant (help customers with orders)
- ✅ View settings (read-only in most areas)
- ❌ **CANNOT** modify products
- ❌ **CANNOT** access financial data
- ❌ **CANNOT** modify inventory
- ❌ **CANNOT** configure shop settings
- ❌ **CANNOT** manage team
- ❌ **CANNOT** access integrations

**Tab Access:**
```typescript
{ id: 'live_chat', roles: [..., Role.SUPPORT_AGENT] }
{ id: 'manage_order', roles: [..., Role.SUPPORT_AGENT] }
{ id: 'settings', roles: [..., Role.SUPPORT_AGENT] } // Limited to read-only
```

**Use Cases:**
- Customer service agents
- Chat support
- Basic order inquiries

---

## 🔒 Row Level Security (RLS) Policies

### **Multi-Tenant Security Architecture:**

**1. Shop Access:**
```sql
-- Users can view shops they're members of
CREATE POLICY "Users can view shops they're members of" ON shops FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
    );
```

**2. Product Access:**
```sql
-- Shop members can view items
CREATE POLICY "Shop members can view items" ON items FOR SELECT 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

-- Only owners/admins can modify items
CREATE POLICY "Shop owners/admins can modify items" ON items FOR ALL 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );
```

**3. Order/Submission Access:**
```sql
-- All shop members can access orders
CREATE POLICY "Shop members can access submissions" ON form_submissions FOR ALL 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );
```

**4. Analytics Access:**
```sql
-- Shop members can view analytics
CREATE POLICY "Shop members can view analytics" ON daily_sales_metrics FOR SELECT 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );
```

---

## 📋 PART 2: Subscription Plan Permissions (IMPLEMENTED)

### **Feature-Based Permissions System:**

The app uses a sophisticated **subscription plan + feature entitlement** system that controls access to premium features.

### **Permission Hook:**

```typescript
// hooks/usePermissions.ts
export const usePermissions = (shop: Shop | null, settingsVersion: number) => {
    const can = (feature: keyof PlanFeatures): boolean => { ... }
    const getLimit = (feature: keyof PlanFeatures): number | null => { ... }
    const getRemainingCredits = (feature): { remaining, limit } => { ... }
    const consumeCredit = (feature) => { ... }
}
```

### **Available Features:**

```typescript
export type PlanFeatures = {
    conversationalCommerce: FeatureEntitlement;      // AI chat commerce
    aiPhotoStudio: FeatureEntitlement;               // AI photo generation
    aiDescriptionGeneration: FeatureEntitlement;     // AI product descriptions
    shopDashboardSuggestion: FeatureEntitlement;     // AI dashboard insights
    basicDashboards: FeatureEntitlement;             // Basic analytics
    advancedDashboards: FeatureEntitlement;          // Advanced analytics
    customUrlSlug: FeatureEntitlement;               // Custom shop URL
    itemCount: FeatureEntitlement;                   // Max products
    keywordRuleCount: FeatureEntitlement;            // Max automation rules
    trainingSectionCount: FeatureEntitlement;        // Max KB sections
    deepThinking: FeatureEntitlement;                // Advanced AI model
    bulkActions: FeatureEntitlement;                 // Bulk operations
    offlineSale: FeatureEntitlement;                 // POS features
    paymentIntelligence: FeatureEntitlement;         // Smart payment detection
};
```

### **Subscription Plans:**

1. **Trial** - Limited features, time-limited
2. **Starter** - Basic features
3. **Growth** - Tiered (500/1000/3000 orders)
4. **Brand** - Advanced branding
5. **Pro** - All features unlocked

### **Usage Examples:**

```typescript
// Check if feature is enabled
if (permissions.can('advancedDashboards')) {
    // Show advanced charts
}

// Check remaining AI credits
const { remaining, limit } = permissions.getRemainingCredits('aiPhotoStudio');
if (remaining > 0) {
    // Allow photo generation
}

// Get feature limit
const maxProducts = permissions.getLimit('itemCount'); // e.g., 50 for Starter
```

---

## 🔧 PART 3: Platform Admin Role (NOT IMPLEMENTED YET)

### **Current Status: ⚠️ TODO**

**What Exists:**
- Edge Functions for admin operations
- Platform settings management
- Admin dashboard functionality

**What's Missing:**
- No `is_admin` column in `profiles` table
- No admin role checking in Edge Functions
- **ANY authenticated user** can currently access admin features

### **Admin-Only Features (Currently Unprotected):**

1. **Platform Settings Management**
   - Subscription plan configuration
   - Platform-wide AI settings
   - Payment method setup
   - Localization settings

2. **Platform Metrics Dashboard**
   - Platform-wide revenue (MRR)
   - Total users and shops
   - Platform growth metrics
   - System health monitoring

3. **Backup & Recovery Operations**
   - Create platform backups
   - Point-in-time recovery
   - Cleanup old snapshots

4. **Database Schema Access**
   - `platform_config` table (via Edge Functions)
   - `platform_metrics` table

### **Current Edge Function Code:**

```typescript
// supabase/functions/admin-platform-settings/index.ts
const { data: { user } } = await supabaseClient.auth.getUser(token);

if (userError || !user) {
  throw new Error('Unauthorized');
}

// TODO: Check if user is admin
// For now, any authenticated user can access (you should add admin role checking)
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

if (!profile) {
  throw new Error('Profile not found');
}

// ⚠️ NO ADMIN CHECK HAPPENING HERE!
```

### **Recommended Implementation:**

**Option 1: Add `is_admin` Column (RECOMMENDED)**

```sql
-- Add admin flag to profiles table
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index for fast admin checks
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Set first user as admin manually
UPDATE profiles 
SET is_admin = true 
WHERE id = 'first-user-uuid';
```

**Update Edge Functions:**
```typescript
// Check admin status
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single();

if (!profile?.is_admin) {
  throw new Error('Admin access required');
}
```

**Option 2: Separate `admin_users` Table**

```sql
CREATE TABLE admin_users (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES profiles(id),
    notes TEXT
);

-- Grant admin to first user
INSERT INTO admin_users (user_id) 
VALUES ('first-user-uuid');
```

---

## 📊 Permission Matrix Summary

| Feature / Role | Owner | Admin | Order Manager | Support Agent | Super Admin |
|---------------|-------|-------|---------------|---------------|-------------|
| **Team Management** | ✅ | ❌ | ❌ | ❌ | N/A |
| **Delete Shop** | ✅ | ❌ | ❌ | ❌ | N/A |
| **Financial Data (Accountant)** | ✅ | ✅ | ❌ | ❌ | N/A |
| **Product Management** | ✅ | ✅ | ✅ | ❌ | N/A |
| **Order Management** | ✅ | ✅ | ✅ | ✅ | N/A |
| **Live Chat** | ✅ | ✅ | ✅ | ✅ | N/A |
| **Shop Settings** | ✅ | ✅ | ✅ (limited) | ✅ (read) | N/A |
| **Integrations** | ✅ | ✅ | ❌ | ❌ | N/A |
| **Platform Settings** | ❌ | ❌ | ❌ | ❌ | ✅ (TODO) |
| **Platform Metrics** | ❌ | ❌ | ❌ | ❌ | ✅ (TODO) |
| **Backup Operations** | ❌ | ❌ | ❌ | ❌ | ✅ (TODO) |

---

## 🎯 Role-Based Actions

### **Tab/Navigation Access Control:**

```typescript
// From App.tsx - Navigation tabs with role restrictions
const mainTabs = [
  { 
    id: 'live_chat', 
    name: t('liveChat'), 
    icon: <MessageCircleIcon />, 
    roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] 
  },
  { 
    id: 'products', 
    name: t('products'), 
    icon: <BoxIcon />, 
    roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER] 
  },
  { 
    id: 'manage_order', 
    name: t('saleAssistant'), 
    icon: <ShoppingCartIcon />, 
    roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] 
  },
  { 
    id: 'accountant', 
    name: t('accountant'), 
    icon: <DollarSignIcon />, 
    roles: [Role.OWNER, Role.ADMIN]  // 💰 Financial access restricted
  },
];

const settingsTab = { 
  id: 'settings', 
  name: t('settings'), 
  icon: <SettingsIcon />, 
  roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] 
};
```

### **Feature-Level Permission Checks:**

```typescript
// In components - check before showing features
const canViewAdvanced = permissions.can('advancedDashboards');
const canUsePaymentIntelligence = permissions.can('paymentIntelligence');

// AI credit checks
const { remaining: suggestionCredits, limit: suggestionLimit } = 
    permissions.getRemainingCredits('shopDashboardSuggestion');

if (suggestionCredits > 0) {
    // Show AI suggestion button
}

// Limit checks
const maxKBSections = permissions.getLimit('trainingSectionCount');
if (sections.length >= maxKBSections) {
    // Show upgrade prompt
}
```

---

## 🚀 Setup Checklist for Super Admin

To implement the Super Admin role system:

### **Step 1: Database Migration**
```sql
-- Add admin column
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Add index
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
```

### **Step 2: Set First User as Admin**
```sql
-- After first user signs up, run:
UPDATE profiles 
SET is_admin = true 
WHERE username = 'your_first_username';

-- Or by user ID
UPDATE profiles 
SET is_admin = true 
WHERE id = '00000000-0000-0000-0000-000000000000';
```

### **Step 3: Update Edge Functions**
Update 2 Edge Functions to enforce admin checking:
1. `supabase/functions/admin-platform-settings/index.ts`
2. `supabase/functions/admin-operations/index.ts`

Add this code after user authentication:
```typescript
// Check if user is admin
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single();

if (!profile?.is_admin) {
  return new Response(
    JSON.stringify({ error: 'Admin access required' }),
    { 
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

### **Step 4: Test Admin Access**
1. Login as admin user
2. Access platform settings
3. Verify non-admin users get 403 error

---

## 📝 Summary

✅ **Team/Shop Roles:** Fully implemented with 4 roles and RLS policies  
✅ **Subscription Permissions:** Complete feature entitlement system  
⏳ **Platform Admin Role:** Needs implementation (add `is_admin` column + Edge Function checks)

**Current Risk:** ANY authenticated user can access platform admin features!  
**Recommendation:** Implement Super Admin role BEFORE deploying to production.

---

*Last Updated: December 8, 2025*
