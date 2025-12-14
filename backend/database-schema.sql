-- ============================================
-- CLIICK.IO - DATABASE SCHEMA
-- ============================================
-- This file sets up all necessary tables and RLS policies
-- Run this in Supabase SQL Editor to initialize the database

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'USER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. SHOPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) DEFAULT 'USD',
  logo_url TEXT,
  assistant_model VARCHAR(100),
  system_prompt TEXT,
  primary_language VARCHAR(10) DEFAULT 'en',
  assistant_tone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access their own shops
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shops" ON shops
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own shops" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own shops" ON shops
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- 3. ITEMS TABLE (Products)
-- ============================================
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(50) DEFAULT 'product',
  retail_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  promo_price DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access items in their shops
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in own shops" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = items.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items in own shops" ON items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = items.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own shops" ON items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = items.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in own shops" ON items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = items.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. FORMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access forms in their shops
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forms in own shops" ON forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = forms.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forms in own shops" ON forms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = forms.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forms in own shops" ON forms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = forms.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forms in own shops" ON forms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = forms.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. FORM_SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  payment_method VARCHAR(100),
  payment_screenshot_url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access submissions from their shops
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions from own shops" ON form_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = form_submissions.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create submissions in own shops" ON form_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = form_submissions.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update submissions in own shops" ON form_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = form_submissions.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 6. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) DEFAULT 'web',
  status VARCHAR(50) DEFAULT 'open',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_ai_active BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access conversations in their shops
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations in own shops" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = conversations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in own shops" ON conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = conversations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations in own shops" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = conversations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 7. CONVERSATION_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL, -- 'user', 'ai', 'seller'
  sender_id UUID,
  text TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  is_note BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access messages from conversations in their shops
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from conversations in own shops" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      JOIN shops ON shops.id = conversations.shop_id
      WHERE conversations.id = conversation_messages.conversation_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in conversations in own shops" ON conversation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      JOIN shops ON shops.id = conversations.shop_id
      WHERE conversations.id = conversation_messages.conversation_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 8. ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  form_submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access orders from their shops
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders from own shops" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = orders.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders in own shops" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = orders.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders in own shops" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = orders.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 9. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only access their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_shop_id ON items(shop_id);
CREATE INDEX IF NOT EXISTS idx_forms_shop_id ON forms(shop_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_shop_id ON form_submissions(shop_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_id ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- DATABASE INITIALIZATION COMPLETE
-- ============================================
-- All tables created with proper RLS policies
-- Users can only access their own data
-- Run this script in: Supabase Dashboard → SQL Editor
