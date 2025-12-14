# 🧪 E2E Testing Execution Guide

**Server Status:** ✅ Running on http://localhost:3001  
**Testing Date:** December 8, 2025  
**Tester:** Please execute each test and document results

---

## 🚀 Quick Start

1. **Open Preview Browser** - Click the preview button above
2. **Open Browser DevTools** - Press F12 (Chrome)
3. **Open Console Tab** - Monitor Supabase operations
4. **Open Supabase Dashboard** - https://app.supabase.com (separate tab)

---

## ✅ Test Checklist

Execute tests in order. Check each box after completion.

### **Pre-Test Setup**
- [ ] Dev server running on http://localhost:3001
- [ ] Browser DevTools open (Console tab visible)
- [ ] Supabase Dashboard open
- [ ] Network tab ready for monitoring

---

## 🧪 TEST 1: Authentication Flow

### **Objective**
Verify Supabase Auth integration (Phase 1 Migration)

### **Steps to Execute**

#### **1.1 Sign Up New User**
- [ ] Click "Sign Up" or navigate to signup page
- [ ] Enter test email: `testuser_${Date.now()}@test.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Click "Sign Up"

**✅ Expected:**
- User created successfully
- Console shows: `✅ User signed up successfully`
- No localStorage auth tokens (check Application → Local Storage)

**🔍 Database Verification:**
1. Open Supabase Dashboard
2. Navigate to Authentication → Users
3. Verify new user exists with email

#### **1.2 Login with Credentials**
- [ ] Navigate to Login page
- [ ] Enter email from signup
- [ ] Enter password
- [ ] Click "Login"

**✅ Expected:**
- Login successful
- Console shows: `✅ User logged in`
- Session active (check Supabase auth state)
- Redirected to dashboard

#### **1.3 Session Persistence**
- [ ] Refresh page (F5)
- [ ] User still logged in

**✅ Expected:**
- No re-login required
- User data loaded from Supabase session

#### **1.4 Logout**
- [ ] Click logout button
- [ ] Verify redirected to login

**✅ Expected:**
- Console shows: `✅ User logged out`
- Session cleared
- Cannot access protected routes

#### **1.5 Re-Login**
- [ ] Login again with same credentials

**✅ Expected:**
- Login successful
- Previous session restored

---

## 🧪 TEST 2: Shop Creation & Management

### **Objective**
Verify shop CRUD operations with Supabase (Phase 2 Migration)

### **Steps to Execute**

#### **2.1 Create New Shop**
- [ ] After login, create shop
- [ ] Enter shop name: "Test Shop 1"
- [ ] Enter description: "E2E Test Shop"
- [ ] Save shop

**✅ Expected:**
- Shop created successfully
- Console shows: `✅ Shop saved to database`
- Shop appears in UI

**🔍 Database Verification:**
1. Supabase Dashboard → Table Editor → `shops`
2. Find shop by name "Test Shop 1"
3. Verify fields: `name`, `description`, `user_id`

#### **2.2 Update Shop Settings**
- [ ] Navigate to Settings → Shop Settings
- [ ] Change shop name to "Test Shop Updated"
- [ ] Add contact email
- [ ] Save changes

**✅ Expected:**
- Settings saved
- Console shows: `✅ Shop updated`
- Refresh → Changes persist

**🔍 Database Verification:**
1. Refresh `shops` table
2. Verify name updated to "Test Shop Updated"

#### **2.3 Custom URL Slug (Async Validation)**
- [ ] Navigate to Settings → Publish
- [ ] Enter custom slug: "test-shop-unique-123"
- [ ] Wait 500ms (debounce)

**✅ Expected:**
- Console shows: `🔍 Checking slug availability`
- Status changes to "Available" (green checkmark)

- [ ] Try duplicate slug: "test" (common word)

**✅ Expected:**
- Status changes to "Taken" (red X)
- Console shows database query

**🔍 Database Verification:**
1. Check `shops` table for slug
2. Verify case-insensitive check works

#### **2.4 Delete Shop**
- [ ] Navigate to Settings → General
- [ ] Click "Delete Shop"
- [ ] Confirm deletion

**✅ Expected:**
- Shop deleted
- Console shows: `✅ Shop deleted from database`
- Redirected to shop creation

**🔍 Database Verification:**
1. Refresh `shops` table
2. Verify shop record removed

---

## 🧪 TEST 3: Product Catalog CRUD

### **Objective**
Verify product operations via callback pattern (Phase 13)

### **Steps to Execute**

#### **3.1 Create New Product**
- [ ] Navigate to Product Catalog
- [ ] Click "Add Product"
- [ ] Enter details:
  - Name: "Test Product 1"
  - Price: 29.99
  - SKU: "TEST-001"
  - Stock: 100
  - Category: "Electronics"
- [ ] Save product

**✅ Expected:**
- Product added to list
- Console shows: `✅ Shop saved to database` (parent callback)
- Product visible in UI

**🔍 Database Verification:**
1. Check `shops` table
2. View `items` JSONB column
3. Find product with SKU "TEST-001"

#### **3.2 Edit Product**
- [ ] Click edit on "Test Product 1"
- [ ] Change price to 24.99
- [ ] Change stock to 95
- [ ] Save changes

**✅ Expected:**
- Product updated in list
- Console shows shop save
- Refresh → Changes persist

#### **3.3 Add Multiple Products**
- [ ] Add 4 more products with different SKUs
- [ ] Verify all appear in list

**✅ Expected:**
- 5 products total
- All saved to database

#### **3.4 Delete Product**
- [ ] Click delete on one product
- [ ] Confirm deletion

**✅ Expected:**
- Product removed from list
- Database updated

**🔍 Database Verification:**
1. Check `shops.items` array
2. Verify product removed

#### **3.5 Stock Management**
- [ ] Update stock quantity on a product
- [ ] Save changes

**✅ Expected:**
- Stock updated
- Console shows save operation

---

## 🧪 TEST 4: Live Chat Real-Time Features ⭐ CRITICAL

### **Objective**
Verify WebSocket subscriptions and real-time updates (Phase 4 Migration)

### **Steps to Execute**

#### **4.1 Create Conversation**
- [ ] Navigate to Live Chat
- [ ] Create new conversation
- [ ] Name: "Test Customer 1"

**✅ Expected:**
- Conversation created
- Console shows: `📡 Setting up real-time subscription for conversation`

#### **4.2 Send Message**
- [ ] Type message: "Hello, test message 1"
- [ ] Click Send

**✅ Expected:**
- Message appears in chat
- Console shows: `💬 Sending message to conversation`
- Database saves message

**🔍 Database Verification:**
1. Check `shops.liveConversations` JSONB
2. Find conversation by ID
3. Verify `messages` array contains message

#### **4.3 Real-Time Testing (Two Tabs)**
- [ ] Open http://localhost:3001 in second tab
- [ ] Login with same user
- [ ] Open same shop
- [ ] Navigate to same conversation in both tabs

**Tab 1:**
- [ ] Send message: "Message from Tab 1"

**Tab 2:**
- [ ] Verify message appears immediately WITHOUT refresh

**✅ Expected:**
- Message appears in Tab 2 within 500ms
- Console shows: `📨 New message received via real-time`
- Real-time subscription working

**Tab 2:**
- [ ] Send message: "Message from Tab 2"

**Tab 1:**
- [ ] Verify message appears immediately

**✅ Expected:**
- Bidirectional real-time working

#### **4.4 Add Private Note**
- [ ] Click "Add Note" button
- [ ] Enter: "Private test note"
- [ ] Save

**✅ Expected:**
- Note marked as private
- Saved to database

#### **4.5 Subscription Cleanup**
- [ ] Close Tab 2
- [ ] Check Tab 1 console for cleanup logs

**✅ Expected:**
- Console shows: `🔌 Cleaning up real-time subscription for: [conversation-id]`
- No memory leaks

---

## 🧪 TEST 5: Team Management

### **Objective**
Verify async team operations (Phase 5 Migration)

### **Steps to Execute**

#### **5.1 Load Team Members**
- [ ] Navigate to Settings → Team Management
- [ ] Wait for users to load

**✅ Expected:**
- Console shows: `Loading all users...` (async operation)
- User list populates

#### **5.2 Invite Team Member**
- [ ] Enter email: `teammember@test.com`
- [ ] Select role: "Member"
- [ ] Click Invite

**✅ Expected:**
- Async operation completes
- Team member added
- Console shows database save

**🔍 Database Verification:**
1. Check `shops.teamMembers` array
2. Verify member with email exists

#### **5.3 Change Role**
- [ ] Change member role to "Admin"
- [ ] Save

**✅ Expected:**
- Role updated
- Database persists change

#### **5.4 Remove Member**
- [ ] Click remove on team member
- [ ] Confirm

**✅ Expected:**
- Member removed
- Database updated

---

## 🧪 TEST 6: User Profile Updates

### **Objective**
Verify async user operations (Phase 6 Migration)

### **Steps to Execute**

#### **6.1 Update Username**
- [ ] Navigate to Settings → My Account
- [ ] Change username to: `testuser_${random}`
- [ ] Click Save

**✅ Expected:**
- Console shows: `Checking username availability...`
- Async validation runs
- Username saved
- Success toast appears

**🔍 Database Verification:**
1. Check `auth.users` table
2. Verify `user_metadata.username` updated

#### **6.2 Try Duplicate Username**
- [ ] Try changing to existing username
- [ ] Save

**✅ Expected:**
- Error: "Username already taken"
- Save blocked

#### **6.3 Change Password**
- [ ] Enter current password
- [ ] Enter new password
- [ ] Confirm new password
- [ ] Save

**✅ Expected:**
- Password updated
- Success notification

#### **6.4 Upload Avatar**
- [ ] Click avatar upload
- [ ] Select image file
- [ ] Upload

**✅ Expected:**
- Avatar appears
- Image saved (Cloudinary if configured)

---

## 🧪 TEST 7: Settings & Configuration

### **Objective**
Verify callback pattern components (Phases 7-9)

### **Steps to Execute**

#### **7.1 Shop Settings**
- [ ] Update business hours
- [ ] Change contact info
- [ ] Save

**✅ Expected:**
- Settings persist
- Database updated via parent callback

#### **7.2 Publish Settings**
- [ ] Toggle shop visibility
- [ ] Update custom domain
- [ ] Save

**✅ Expected:**
- Settings saved
- Refresh → Changes persist

---

## 🧪 TEST 8: Platform Settings

### **Objective**
Verify platform settings service (Phase 3 Migration)

### **Steps to Execute**

#### **8.1 View Subscription**
- [ ] Navigate to Settings → Subscription
- [ ] View current plan

**✅ Expected:**
- Plan loaded from Supabase
- Features displayed correctly

**🔍 Database Verification:**
1. Check `platform_settings` table
2. Verify settings JSON

#### **8.2 Configuration Panel**
- [ ] Navigate to Configuration
- [ ] Update platform setting
- [ ] Save

**✅ Expected:**
- Setting saved to Supabase
- Refresh → Persists

---

## 🧪 TEST 9: Order Management

### **Objective**
Verify callback pattern (Phase 14)

### **Steps to Execute**

#### **9.1 Create Order**
- [ ] Navigate to Orders
- [ ] Create new offline sale
- [ ] Add products
- [ ] Save order

**✅ Expected:**
- Order saved via callback
- Database updated

**🔍 Database Verification:**
1. Check `shops.formSubmissions` JSONB
2. Verify order data

---

## 🧪 TEST 10: Automation

### **Objective**
Verify callback pattern (Phase 15-16)

### **Steps to Execute**

#### **10.1 Create Keyword Rule**
- [ ] Navigate to Automation
- [ ] Add keyword: "hello"
- [ ] Set reply: "Welcome!"
- [ ] Save

**✅ Expected:**
- Rule saved via callback
- Database updated

**🔍 Database Verification:**
1. Check `shops.keywordReplies` JSONB

#### **10.2 Saved Replies**
- [ ] Navigate to Saved Replies
- [ ] Create new reply
- [ ] Save

**✅ Expected:**
- Reply persisted
- Refresh → Still exists

---

## 📊 Performance Monitoring

### **During All Tests, Monitor:**

#### **Console Logs**
- ✅ No error messages
- ✅ Supabase operations logged
- ✅ Real-time subscriptions working
- ✅ Cleanup logs on unmount

#### **Network Tab**
- ✅ API calls to Supabase
- ✅ Response times < 2 seconds
- ✅ No failed requests

#### **Database**
- ✅ All operations persist
- ✅ Data structure correct
- ✅ No orphaned records

---

## ✅ Success Criteria

### **All Tests Must:**
- [ ] Complete without errors
- [ ] Data persists to Supabase
- [ ] Real-time features work
- [ ] No console errors
- [ ] Performance acceptable

---

## 🐛 If Issues Found

### **Document:**
1. Test number and step
2. Expected vs actual behavior
3. Console error messages
4. Screenshot
5. Database state

### **Example Issue Report:**
```
Test: 4.3 (Real-Time Testing)
Step: Send message from Tab 1
Expected: Message appears in Tab 2 within 500ms
Actual: Message does not appear, requires refresh
Console Error: WebSocket connection failed
Database: Message saved correctly
```

---

## 📝 Testing Notes Section

Use this space to document findings:

```
[Your testing notes here]

Test 1 Results: 
Test 2 Results:
Test 3 Results:
Test 4 Results:
Test 5 Results:
Test 6 Results:
Test 7 Results:
Test 8 Results:
Test 9 Results:
Test 10 Results:

Overall Status: [PASS/FAIL]
Critical Issues: [Count]
Minor Issues: [Count]
```

---

**Ready to test! Click the preview button to start.**
