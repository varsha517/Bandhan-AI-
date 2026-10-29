/*
# Campaign Delivery System & Dataset Relationships

## Overview
Adds campaign recipient tracking, message delivery status, dataset-to-customer
relationships, opt-out fields, and transaction quantity support to enable real
campaign delivery through email/SMS/WhatsApp providers.

## New Tables
1. **campaign_recipients** — tracks each recipient of a campaign with delivery status,
   provider message ID, sent/delivered/opened/clicked timestamps, and error messages.

## Modified Tables
1. **customers** — adds dataset_id (FK to uploaded_datasets), email_opt_out, sms_opt_out,
   whatsapp_opt_out boolean fields for compliance.
2. **transactions** — adds quantity column.
3. **campaigns** — adds description, objective, audience_type, audience_filter columns
   for the multi-step campaign creation flow.

## Security
- RLS enabled on campaign_recipients with owner-scoped CRUD policies.
- All existing RLS policies preserved.
*/

-- ============ ADD COLUMNS TO CUSTOMERS ============
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dataset_id uuid REFERENCES uploaded_datasets(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_opt_out boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean DEFAULT false;

-- ============ ADD COLUMNS TO TRANSACTIONS ============
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- ============ ADD COLUMNS TO CAMPAIGNS ============
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_type text DEFAULT 'all';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_filter jsonb;

-- ============ CAMPAIGN RECIPIENTS ============
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'Email',
  recipient text,
  personalized_content text,
  status text DEFAULT 'queued',
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaign_recipients" ON campaign_recipients;
CREATE POLICY "select_own_campaign_recipients" ON campaign_recipients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campaign_recipients" ON campaign_recipients;
CREATE POLICY "insert_own_campaign_recipients" ON campaign_recipients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campaign_recipients" ON campaign_recipients;
CREATE POLICY "update_own_campaign_recipients" ON campaign_recipients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campaign_recipients" ON campaign_recipients;
CREATE POLICY "delete_own_campaign_recipients" ON campaign_recipients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer_id ON campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user_id ON campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_dataset_id ON customers(dataset_id);
