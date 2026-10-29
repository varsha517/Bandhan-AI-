export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  segment: string;
  churn_score: number;
  churn_risk: string;
  sentiment_score: number;
  sentiment_label: string;
  total_spent: number;
  total_orders: number;
  last_purchase_date: string | null;
  status: string;
  avatar_color: string;
  dataset_id: string | null;
  email_opt_out: boolean;
  sms_opt_out: boolean;
  whatsapp_opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  amount: number;
  product_name: string | null;
  category: string | null;
  quantity: number;
  status: string;
  transaction_date: string;
  created_at: string;
}

export interface Segment {
  id: string;
  customer_id: string;
  segment_name: string;
  rfm_score: number;
  recency_days: number;
  frequency: number;
  monetary: number;
  cluster_label: number | null;
  created_at: string;
  customer?: Customer;
}

export interface ChurnPrediction {
  id: string;
  customer_id: string;
  churn_probability: number;
  risk_level: string;
  confidence_score: number;
  reasons: string[];
  suggested_strategy: string;
  model_version: string;
  created_at: string;
  customer?: Customer;
}

export interface MembershipTier {
  id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  discount_percent: number;
  color: string;
  benefits: string[];
  display_order: number;
}

export interface LoyaltyAccount {
  id: string;
  customer_id: string;
  points: number;
  tier_name: string;
  lifetime_points: number;
  points_redeemed: number;
  joined_date: string;
  updated_at: string;
  customer?: Customer;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  category: string;
  tier_required: string | null;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  channel: string;
  target_segment: string | null;
  status: string;
  content: string | null;
  subject_line: string | null;
  description: string | null;
  objective: string | null;
  audience_type: string | null;
  audience_filter: Record<string, unknown> | null;
  target_audience_count: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  success_rate: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: string;
  recipient: string | null;
  personalized_content: string | null;
  status: string;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
  customer?: Customer;
}

export interface Sentiment {
  id: string;
  customer_id: string;
  source: string;
  content: string | null;
  sentiment_label: string;
  sentiment_score: number;
  rating: number | null;
  created_at: string;
  customer?: Customer;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string | null;
  customer_id: string | null;
  priority: string;
  potential_value: number;
  status: string;
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  format: string;
  date_range: string | null;
  summary: string | null;
  data: Record<string, unknown> | null;
  status: string;
  dataset_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  icon: string;
  created_at: string;
}

export interface UploadedDataset {
  id: string;
  filename: string;
  file_size: number;
  row_count: number;
  column_count: number;
  columns: string[] | null;
  quality_score: number;
  missing_values: number;
  duplicates: number;
  outliers: number;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}
