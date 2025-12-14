# 🧪 End-to-End Testing Plan

**Testing Date:** December 8, 2025  
**Objective:** Verify all 15 migrated components work correctly with Supabase backend  
**Scope:** Complete user flows from authentication to advanced features

---

## 📋 Testing Strategy

### **Approach**
1. **Manual Testing** - Execute critical user flows step-by-step
2. **Database Verification** - Check Supabase data persistence
3. **Real-Time Testing** - Verify WebSocket subscriptions
4. **Error Handling** - Test edge cases and error scenarios
5. **Performance Monitoring** - Check response times and loading states

### **Environment**
- **Frontend:** React 19.2 + Vite dev server (http://localhost:3000)
- **Backend:** Supabase (database, auth, realtime)
- **Browser:** Chrome DevTools for console monitoring
- **Database:** Supabase Dashboard for data verification

---

## 🧪 Test Cases

### **Test 1: Authentication Flow** ✅ Phase 1 Migration
**Components:** LoginScreen, SignupScreen, App.tsx  
**Services:** supabaseAuthService.ts

**Steps:**
1. ✅ Start dev server: `npm run dev`
2. ✅ Open http://localhost:3000
3. ✅ Navigate to Sign Up
4. ✅ Create new account with email/password
5. ✅ Verify email confirmation (if required)
6. ✅ Login with credentials
7. ✅ Check session persistence (refresh page)
8. ✅ Logout
9. ✅ Login again

**Expected Results:**
- User created in Supabase Auth
- Session stored in Supabase (not localStorage)
- Console logs show Supabase operations
- No localStorage auth tokens

**Database Verification:**
- Check `auth.users` table in Supabase
- Verify user record exists

---

### **Test 2: Shop Creation & Management** ✅ Phase 2 Migration
**Components:** ShopSettingsPanel, SettingsPanel, PublishPanel  
**Services:** supabaseShopService.ts

**Steps:**
1. ✅ After login, create new shop
2. ✅ Set shop name, description, avatar
3. ✅ Save shop settings
4. ✅ Navigate to Settings → Shop Settings
5. ✅ Update shop information
6. ✅ Navigate to Settings → Publish
7. ✅ Set custom URL slug
8. ✅ Verify slug availability check (async)
9. ✅ Try duplicate slug (should show "taken")
10. ✅ Save unique slug
11. ✅ Delete shop (from Settings panel)
12. ✅ Create new shop again

**Expected Results:**
- Shop saved to Supabase `shops` table
- Slug validation queries database
- Shop updates persist across refresh
- Delete removes from database

**Database Verification:**
- Check `shops` table
- Verify `custom_url_slug` field
- Confirm shop deletion

---

### **Test 3: Product Catalog CRUD Operations** ✅ Phase 13 Analysis
**Component:** ProductCatalog  
**Pattern:** Callback → Parent persists to Supabase

**Steps:**
1. ✅ Navigate to Product Catalog
2. ✅ Add new product
   - Name, description, price, SKU
   - Upload product image
   - Set stock quantity
   - Assign category
3. ✅ Save product
4. ✅ Refresh page → Verify product persists
5. ✅ Edit product
   - Update name, price
   - Change stock quantity
6. ✅ Save changes
7. ✅ Add multiple products (5-10)
8. ✅ Test CSV import
9. ✅ Test CSV export
10. ✅ Delete a product
11. ✅ Test category management
12. ✅ Test AI description generation (if integrated)

**Expected Results:**
- Products saved to `items` array in shop object
- Shop object saved to Supabase
- All CRUD operations persist
- CSV import/export works
- Stock updates reflected

**Database Verification:**
- Check `shops.items` JSONB field
- Verify product data structure
- Confirm deletions

---

### **Test 4: Live Chat Real-Time Features** ✅ Phase 4 Migration
**Component:** LiveChatPanel  
**Services:** supabaseShopService.ts (real-time subscriptions)

**Steps:**
1. ✅ Navigate to Live Chat
2. ✅ Create new conversation
3. ✅ Send message
4. ✅ Open browser DevTools console
5. ✅ Check for real-time subscription logs:
   - "📡 Setting up real-time subscription for conversation"
   - "📨 New message received via real-time"
6. ✅ Open second browser tab (same shop)
7. ✅ Send message from Tab 1
8. ✅ Verify message appears in Tab 2 (real-time)
9. ✅ Send message from Tab 2
10. ✅ Verify message appears in Tab 1
11. ✅ Add private note
12. ✅ Close conversation
13. ✅ Reopen conversation → Messages persist
14. ✅ Close tab → Check cleanup logs:
    - "🔌 Cleaning up real-time subscription"

**Expected Results:**
- Messages saved to Supabase
- Real-time updates work between tabs
- Subscriptions cleaned up on unmount
- Console logs confirm WebSocket connection
- No memory leaks

**Database Verification:**
- Check `shops.liveConversations` JSONB
- Verify messages array
- Confirm timestamps

**Performance:**
- Real-time latency < 500ms
- No console errors

---

### **Test 5: Team Management Operations** ✅ Phase 5 Migration
**Component:** TeamManagementPanel  
**Services:** supabaseAuthService.ts

**Steps:**
1. ✅ Navigate to Settings → Team Management
2. ✅ Wait for users to load (async)
3. ✅ Invite team member by email
4. ✅ Verify invite sent
5. ✅ Assign role (Admin/Member)
6. ✅ Change team member role
7. ✅ Remove team member
8. ✅ Refresh page → Verify team persists

**Expected Results:**
- Team members loaded from Supabase
- Invite operations async
- Role changes persist
- Removals update database

**Database Verification:**
- Check `shops.teamMembers` array
- Verify role assignments

---

### **Test 6: User Profile Updates** ✅ Phase 6 Migration
**Component:** MyAccountPanel  
**Services:** supabaseAuthService.ts

**Steps:**
1. ✅ Navigate to Settings → My Account
2. ✅ Update username
   - Try existing username (should fail)
   - Enter unique username
3. ✅ Verify async validation
4. ✅ Save username
5. ✅ Change password
6. ✅ Upload avatar image
7. ✅ Verify avatar appears
8. ✅ Remove avatar
9. ✅ Refresh page → Changes persist

**Expected Results:**
- Username validation queries database
- Updates saved to Supabase Auth
- Avatar uploads to Cloudinary (if configured)
- Password change works
- Success toasts appear

**Database Verification:**
- Check `auth.users` table
- Verify `user_metadata` fields

---

### **Test 7: Settings & Configuration** ✅ Phases 7-9 Migration
**Components:** ShopSettingsPanel, SettingsPanel, PublishPanel

**Steps:**
1. ✅ Navigate to Settings → Shop Settings
2. ✅ Update business hours
3. ✅ Change contact information
4. ✅ Save settings
5. ✅ Navigate to Publish
6. ✅ Toggle shop visibility
7. ✅ Update custom domain
8. ✅ Save publish settings
9. ✅ Refresh → Verify all persist

**Expected Results:**
- All settings saved via parent callback
- Parent saves to Supabase
- Settings persist across refresh

**Database Verification:**
- Check `shops` table
- Verify all settings fields

---

### **Test 8: Platform Settings & Subscriptions** ✅ Phases 10-12 Analysis
**Components:** SubscriptionPanel, ConfigurationPanel  
**Services:** platformSettingsService.ts (Phase 3 migration)

**Steps:**
1. ✅ Navigate to Settings → Subscription
2. ✅ View current plan
3. ✅ Check plan features (loaded from platform settings)
4. ✅ Schedule plan change
5. ✅ Navigate to Configuration
6. ✅ Update platform-wide settings
7. ✅ Save configuration
8. ✅ Refresh → Settings persist

**Expected Results:**
- Platform settings loaded from Supabase
- Subscription data from database
- Configuration saves to Supabase

**Database Verification:**
- Check `platform_settings` table
- Verify JSON structure

---

### **Test 9: Order Management Flow** ✅ Phase 14 Analysis
**Component:** ManageOrderPanel  
**Pattern:** Callback → Parent persists

**Steps:**
1. ✅ Navigate to Orders
2. ✅ Create new order (offline sale)
3. ✅ Add products to order
4. ✅ Calculate totals
5. ✅ Save order
6. ✅ View order details
7. ✅ Update order status
8. ✅ Generate receipt
9. ✅ Refresh → Order persists

**Expected Results:**
- Orders saved via callback
- Parent saves to Supabase
- Form submissions stored

**Database Verification:**
- Check `shops.formSubmissions` JSONB
- Verify order data

---

### **Test 10: Automation & Saved Replies** ✅ Phases 15-16 Analysis
**Components:** KeywordAutomationPanel, SavedRepliesPanel  
**Pattern:** Callback → Parent persists

**Steps:**
1. ✅ Navigate to Automation
2. ✅ Create keyword automation rule
3. ✅ Set trigger keyword
4. ✅ Set auto-reply message
5. ✅ Save rule
6. ✅ Navigate to Saved Replies
7. ✅ Create saved reply
8. ✅ Save reply
9. ✅ Edit existing reply
10. ✅ Delete reply
11. ✅ Refresh → All persist

**Expected Results:**
- Keyword rules saved via callback
- Saved replies persisted
- Parent saves to Supabase

**Database Verification:**
- Check `shops.keywordReplies` JSONB
- Check `shops.savedReplies` JSONB

---

## 🐛 Error Scenarios to Test

### **Authentication Errors**
- ❌ Invalid email format
- ❌ Weak password
- ❌ Duplicate email signup
- ❌ Wrong login credentials
- ❌ Expired session

### **Shop Operations Errors**
- ❌ Duplicate slug
- ❌ Invalid shop data
- ❌ Delete shop with active orders
- ❌ Network failure during save

### **Product Catalog Errors**
- ❌ Invalid SKU format
- ❌ Negative stock quantity
- ❌ Malformed CSV import
- ❌ Large file upload (>10MB)

### **Live Chat Errors**
- ❌ Send message to closed conversation
- ❌ Network disconnection during subscription
- ❌ Subscription cleanup failure

### **Team Management Errors**
- ❌ Invite non-existent user
- ❌ Remove shop owner
- ❌ Duplicate team member

---

## 📊 Performance Benchmarks

### **Target Metrics**
| Operation | Target Time |
|-----------|-------------|
| Login | < 2 seconds |
| Load Shop | < 1 second |
| Load Products (100 items) | < 2 seconds |
| Save Product | < 1 second |
| Real-time Message | < 500ms |
| Slug Validation | < 1 second |

### **Monitoring Tools**
- Chrome DevTools Network tab
- Console performance logs
- Supabase Dashboard (query logs)

---

## ✅ Success Criteria

### **Functional**
- ✅ All 10 test cases pass
- ✅ No console errors during normal operation
- ✅ All data persists to Supabase
- ✅ Real-time features work correctly
- ✅ Error handling graceful

### **Performance**
- ✅ All operations within target times
- ✅ No memory leaks
- ✅ Subscriptions cleaned up properly

### **Data Integrity**
- ✅ All CRUD operations verified in database
- ✅ No orphaned data
- ✅ Relationships maintained

---

## 📝 Test Execution Log

### **Preparation**
- [ ] Clear browser cache
- [ ] Clear Supabase test data
- [ ] Start dev server
- [ ] Open DevTools console
- [ ] Open Supabase Dashboard

### **During Testing**
- [ ] Take screenshots of key steps
- [ ] Record console logs
- [ ] Note performance metrics
- [ ] Document any errors

### **After Testing**
- [ ] Review database state
- [ ] Check for orphaned subscriptions
- [ ] Verify cleanup
- [ ] Document findings

---

## 🚀 Next Steps After Testing

1. **If All Tests Pass:**
   - Create production deployment checklist
   - Set up staging environment
   - Plan UAT with stakeholders

2. **If Issues Found:**
   - Document bugs with reproduction steps
   - Prioritize fixes (critical/high/medium/low)
   - Fix and re-test

3. **Performance Issues:**
   - Identify slow queries
   - Add database indexes
   - Optimize real-time subscriptions

---

*Ready to execute. Starting with Test 1: Authentication Flow...*
