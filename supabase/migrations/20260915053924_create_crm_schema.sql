/*
# Bandhai AI CRM — Core Schema

## Overview
Creates the full database schema for the Bandhai AI CRM platform: customers,
transactions, segments, churn predictions, loyalty accounts, membership tiers,
rewards, campaigns, sentiments, recommendations, reports, notifications, and
audit logs. All tables are owner-scoped to the authenticated user via `user_id`.

## New Tables
1. **customers** — customer records with personal info, churn score, sentiment score
2. **transactions** — purchase history linked to customers
3. **segments** — customer segmentation results (RFM / K-Means)
4. **churn_predictions** — churn risk assessments per customer
5. **loyalty_accounts** — loyalty points and membership tier per customer
6. **membership_tiers** — tier definitions (Bronze, Silver, Gold, Platinum)
7. **rewards** — redeemable rewards catalog
8. **campaigns** — AI-generated marketing campaigns
9. **sentiments** — customer sentiment analysis results
10. **recommendations** — AI-generated business recommendations
11. **reports** — generated analytics reports
12. **notifications** — real-time alerts and notifications
13. **audit_logs** — audit trail of user actions
14. **uploaded_datasets** — metadata for uploaded customer datasets

## Security
- RLS enabled on every table.
- Owner-scoped CRUD policies (auth.uid() = user_id) for all tables.
- user_id defaults to auth.uid() so inserts without explicit user_id succeed.
*/

-- ============ CUSTOMERS ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  location text,
  segment text DEFAULT 'Regular',
  churn_score numeric DEFAULT 0,
  churn_risk text DEFAULT 'Low',
  sentiment_score numeric DEFAULT 0,
  sentiment_label text DEFAULT 'Neutral',
  total_spent numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  last_purchase_date date,
  status text DEFAULT 'Active',
  avatar_color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  product_name text,
  category text,
  status text DEFAULT 'Completed',
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SEGMENTS ============
CREATE TABLE IF NOT EXISTS segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_name text NOT NULL,
  rfm_score numeric DEFAULT 0,
  recency_days integer DEFAULT 0,
  frequency integer DEFAULT 0,
  monetary numeric DEFAULT 0,
  cluster_label integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_segments" ON segments;
CREATE POLICY "select_own_segments" ON segments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_segments" ON segments;
CREATE POLICY "insert_own_segments" ON segments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_segments" ON segments;
CREATE POLICY "update_own_segments" ON segments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_segments" ON segments;
CREATE POLICY "delete_own_segments" ON segments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ CHURN PREDICTIONS ============
CREATE TABLE IF NOT EXISTS churn_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  churn_probability numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'Low',
  confidence_score numeric DEFAULT 0,
  reasons text[],
  suggested_strategy text,
  model_version text DEFAULT 'v1.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_churn" ON churn_predictions;
CREATE POLICY "select_own_churn" ON churn_predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_churn" ON churn_predictions;
CREATE POLICY "insert_own_churn" ON churn_predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_churn" ON churn_predictions;
CREATE POLICY "update_own_churn" ON churn_predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_churn" ON churn_predictions;
CREATE POLICY "delete_own_churn" ON churn_predictions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ MEMBERSHIP TIERS ============
CREATE TABLE IF NOT EXISTS membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_points integer NOT NULL DEFAULT 0,
  max_points integer,
  discount_percent numeric DEFAULT 0,
  color text DEFAULT '#3b82f6',
  benefits text[],
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_tiers" ON membership_tiers;
CREATE POLICY "select_own_tiers" ON membership_tiers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tiers" ON membership_tiers;
CREATE POLICY "insert_own_tiers" ON membership_tiers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tiers" ON membership_tiers;
CREATE POLICY "update_own_tiers" ON membership_tiers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_tiers" ON membership_tiers;
CREATE POLICY "delete_own_tiers" ON membership_tiers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LOYALTY ACCOUNTS ============
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  tier_name text DEFAULT 'Bronze',
  lifetime_points integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  joined_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_loyalty" ON loyalty_accounts;
CREATE POLICY "select_own_loyalty" ON loyalty_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_loyalty" ON loyalty_accounts;
CREATE POLICY "insert_own_loyalty" ON loyalty_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_loyalty" ON loyalty_accounts;
CREATE POLICY "update_own_loyalty" ON loyalty_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_loyalty" ON loyalty_accounts;
CREATE POLICY "delete_own_loyalty" ON loyalty_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REWARDS ============
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL DEFAULT 100,
  category text DEFAULT 'Discount',
  tier_required text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_rewards" ON rewards;
CREATE POLICY "select_own_rewards" ON rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_rewards" ON rewards;
CREATE POLICY "insert_own_rewards" ON rewards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_rewards" ON rewards;
CREATE POLICY "update_own_rewards" ON rewards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_rewards" ON rewards;
CREATE POLICY "delete_own_rewards" ON rewards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ CAMPAIGNS ============
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Email',
  channel text DEFAULT 'Email',
  target_segment text,
  status text DEFAULT 'Draft',
  content text,
  subject_line text,
  target_audience_count integer DEFAULT 0,
  open_rate numeric DEFAULT 0,
  click_rate numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  success_rate numeric DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns" ON campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_campaigns" ON campaigns;
CREATE POLICY "insert_own_campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_campaigns" ON campaigns;
CREATE POLICY "update_own_campaigns" ON campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_campaigns" ON campaigns;
CREATE POLICY "delete_own_campaigns" ON campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SENTIMENTS ============
CREATE TABLE IF NOT EXISTS sentiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source text DEFAULT 'Review',
  content text,
  sentiment_label text NOT NULL DEFAULT 'Neutral',
  sentiment_score numeric DEFAULT 0,
  rating integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sentiments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_sentiments" ON sentiments;
CREATE POLICY "select_own_sentiments" ON sentiments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sentiments" ON sentiments;
CREATE POLICY "insert_own_sentiments" ON sentiments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sentiments" ON sentiments;
CREATE POLICY "update_own_sentiments" ON sentiments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sentiments" ON sentiments;
CREATE POLICY "delete_own_sentiments" ON sentiments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ RECOMMENDATIONS ============
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  priority text DEFAULT 'Medium',
  potential_value numeric DEFAULT 0,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_recommendations" ON recommendations;
CREATE POLICY "select_own_recommendations" ON recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_recommendations" ON recommendations;
CREATE POLICY "insert_own_recommendations" ON recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_recommendations" ON recommendations;
CREATE POLICY "update_own_recommendations" ON recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_recommendations" ON recommendations;
CREATE POLICY "delete_own_recommendations" ON recommendations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REPORTS ============
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Customer Analytics',
  format text DEFAULT 'PDF',
  date_range text,
  summary text,
  data jsonb,
  status text DEFAULT 'Generated',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reports" ON reports;
CREATE POLICY "update_own_reports" ON reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reports" ON reports;
CREATE POLICY "delete_own_reports" ON reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'Info',
  read boolean DEFAULT false,
  icon text DEFAULT 'bell',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_audit" ON audit_logs;
CREATE POLICY "select_own_audit" ON audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audit" ON audit_logs;
CREATE POLICY "insert_own_audit" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ UPLOADED DATASETS ============
CREATE TABLE IF NOT EXISTS uploaded_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size bigint DEFAULT 0,
  row_count integer DEFAULT 0,
  column_count integer DEFAULT 0,
  columns jsonb,
  detected_schema jsonb,
  quality_score numeric DEFAULT 0,
  missing_values integer DEFAULT 0,
  duplicates integer DEFAULT 0,
  outliers integer DEFAULT 0,
  status text DEFAULT 'Uploaded',
  processing_log jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE uploaded_datasets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_datasets" ON uploaded_datasets;
CREATE POLICY "select_own_datasets" ON uploaded_datasets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_datasets" ON uploaded_datasets;
CREATE POLICY "insert_own_datasets" ON uploaded_datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_datasets" ON uploaded_datasets;
CREATE POLICY "update_own_datasets" ON uploaded_datasets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_datasets" ON uploaded_datasets;
CREATE POLICY "delete_own_datasets" ON uploaded_datasets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_segments_customer_id ON segments(customer_id);
CREATE INDEX IF NOT EXISTS idx_churn_customer_id ON churn_predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer_id ON loyalty_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sentiments_customer_id ON sentiments(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON uploaded_datasets(user_id);