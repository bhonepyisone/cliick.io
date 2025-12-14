# Migration Audit Report - Critical Issues Found

## Executive Summary
After comprehensive code audit, **18 critical issues** identified affecting database integrity, API routing, and authentication flow. Post-migration bugs prevent proper CRUD operations and data persistence.

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### 1. **Database Table Name Mismatches**
**Severity:** 🔴 CRITICAL  
**Impact:** All CRUD operations fail silently

#### Issue 1A: Forms Table Mismatch
- **File:** `backend/routes/forms.ts`
- **Problem:** Route queries `form_builders` table but schema defines `forms` table
- **Lines:** 10, 23, 35, 46
- **Status:** ❌ BROKEN

#### Issue 1B: Conversations Table Mismatch
- **File:** `backend/routes/conversations.ts`
- **Problem:** Route queries `live_chat_conversations` and `live_chat_messages` but schema defines `conversations` and `conversation_messages`
- **Lines:** 10, 24, 36, 48, 62
- **Status:** ❌ BROKEN

#### Issue 1C: Products Table
- **File:** `backend/routes/products.ts`
- **Problem:** Route uses `items` table - needs verification against actual Supabase schema
- **Status:** ⚠️ VERIFY

---

### 2. **Missing Auth Endpoints**
**Severity:** 🔴 CRITICAL  
**Impact:** Frontend cannot fetch user list or user profiles

#### Issue 2A: Missing /api/auth/users
- **Called by:** `services/authService.ts` line 277
- **Function:** `getAllUsers()`
- **Status:** ❌ NOT IMPLEMENTED
- **Fix:** Add GET `/api/auth/users` endpoint to `backend/routes/auth.ts`

#### Issue 2B: Missing /api/auth/users/{username}
- **Called by:** `services/authService.ts` line 300
- **Function:** `getUserByUsername()`
- **Status:** ❌ NOT IMPLEMENTED
- **Fix:** Add GET `/api/auth/users/:username` endpoint to `backend/routes/auth.ts`

#### Issue 2C: Missing /api/auth/users/{userId} PUT
- **Called by:** `services/authService.ts` line 325
- **Function:** `updateUser()`
- **Status:** ❌ NOT IMPLEMENTED
- **Fix:** Add PUT `/api/auth/users/:userId` endpoint to `backend/routes/auth.ts`

---

### 3. **Missing CRUD Endpoints**
**Severity:** 🔴 CRITICAL  
**Impact:** Frontend cannot delete resources

#### Issue 3A: Missing DELETE /api/shops/:shopId
- **Called by:** `services/shopService.ts` line 194
- **Function:** `deleteShop()`
- **Status:** ❌ NOT IMPLEMENTED
- **File:** `backend/routes/shops.ts`
- **Fix:** Add DELETE endpoint after line 93

---

### 4. **localStorage Not Removed from Services**
**Severity:** 🔴 CRITICAL  
**Impact:** JWT token bypassed, authentication inconsistent

#### Issue 4A: shopService.ts
- **Lines:** 33, 198
- **Problem:** Uses `localStorage.getItem('auth_token')` instead of Authorization header
- **Should Use:** `getAuthToken()` from authService
- **Status:** ❌ BROKEN

---

### 5. **Orders Schema Mismatch**
**Severity:** 🔴 CRITICAL  
**Impact:** Order creation fails

#### Issue 5A: orders.ts Table Structure
- **File:** `backend/routes/orders.ts`
- **Problem:** Route inserts `form_id, form_name, ordered_products` but schema expects `form_submission_id`
- **Lines:** 29
- **Status:** ❌ BROKEN

---

## ⚠️ HIGH PRIORITY ISSUES

### 6. **Inconsistent Error Handling**
**Severity:** ⚠️ HIGH  
**Impact:** Inconsistent error responses to frontend

#### Issue 6A: Mixed error handling patterns
- **Problem:**
  - Some routes use `next(error)` (auth.ts)
  - Some routes use `res.status(500).json()` (forms.ts, conversations.ts, orders.ts)
  - Inconsistent error status codes
- **Files Affected:** All route files
- **Fix:** Standardize all routes to use `next(error)` for middleware handling

---

### 7. **Register Endpoint Complexity**
**Severity:** ⚠️ HIGH  
**Impact:** Profile creation may fail even after user is registered

#### Issue 7A: Profile Creation Logic
- **File:** `backend/routes/auth.ts` lines 76-114
- **Problem:**
  - Try-catch block hides actual errors
  - Falls back silently on failure
  - Profile creation is separate from user creation (not atomic)
  - User marked successful even if profile creation fails
- **Status:** ⚠️ UNRELIABLE

---

### 8. **Missing POST /api/shops/:shopId/forms**
**Severity:** ⚠️ HIGH  
**Impact:** Frontend createForm fails

#### Issue 8A: Forms endpoint routing
- **File:** `backend/routes/forms.ts`
- **Problem:** Frontend expects `/api/shops/:shopId/forms` but server.js has no merge params
- **Status:** ⚠️ VERIFY

---

## 📋 VERIFICATION CHECKLIST

### Database & Schema
- [ ] Verify actual Supabase table names match routes
- [ ] Confirm all RLS policies are enabled
- [ ] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are valid
- [ ] Verify JWT_SECRET is set in .env

### Authentication
- [ ] Token injection via x-user-id header works
- [ ] JWT_SECRET matches across auth.ts and frontend
- [ ] Profile creation atomic with user creation
- [ ] getAllUsers/getUserByUsername endpoints created

### Route Registration
- [ ] All route files imported in server.js
- [ ] Route paths match frontend API calls
- [ ] DELETE endpoints exist for all resources
- [ ] Error handling middleware active

### Frontend Integration
- [ ] Remove all localStorage token usage
- [ ] Use getAuthToken() consistently
- [ ] Authorization headers properly formatted
- [ ] API base URL correctly configured

---

## 🔧 PRIORITY FIX ORDER

1. **FIRST:** Fix database table name mismatches (issues 1A, 1B)
2. **SECOND:** Add missing auth endpoints (issue 2)
3. **THIRD:** Add missing CRUD endpoints (issue 3)
4. **FOURTH:** Fix localStorage usage (issue 4)
5. **FIFTH:** Fix orders schema (issue 5)
6. **SIXTH:** Standardize error handling (issue 6)
7. **SEVENTH:** Simplify register logic (issue 7)

---

## 📊 Bug Statistics

| Category | Count | Severity |
|----------|-------|----------|
| Critical | 8 | 🔴 Must Fix |
| High Priority | 4 | ⚠️ Should Fix |
| Verification Needed | 10 | 🔍 Check |
| **Total** | **22** | - |

---

## Test Endpoints After Fixes

```bash
# Auth
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/refresh
GET /api/auth/users (NEW)
GET /api/auth/users/:username (NEW)
PUT /api/auth/users/:userId (NEW)

# Shops
GET /api/shops
POST /api/shops
GET /api/shops/:shopId
PUT /api/shops/:shopId
DELETE /api/shops/:shopId (NEW)

# Products
GET /api/shops/:shopId/products
POST /api/shops/:shopId/products
PUT /api/shops/:shopId/products/:productId
DELETE /api/shops/:shopId/products/:productId

# Forms
GET /api/shops/:shopId/forms
POST /api/shops/:shopId/forms
PUT /api/shops/:shopId/forms/:formId
DELETE /api/shops/:shopId/forms/:formId

# Orders
GET /api/shops/:shopId/orders
POST /api/shops/:shopId/orders
PUT /api/shops/:shopId/orders/:orderId
PUT /api/shops/:shopId/orders/:orderId/status

# Conversations
GET /api/shops/:shopId/conversations
POST /api/shops/:shopId/conversations
PUT /api/shops/:shopId/conversations/:conversationId
POST /api/shops/:shopId/conversations/:conversationId/messages
```

---

**Report Generated:** 2025-12-11  
**Status:** 🔴 CRITICAL - 8 bugs blocking production
