/*
# Seed Demo Data Function

## Overview
Creates a SECURITY DEFINER function `seed_demo_data()` that populates all CRM
tables with realistic sample data for the calling authenticated user. This runs
once after signup so the dashboard isn't empty.

## What It Seeds
1. 4 membership tiers (Bronze, Silver, Gold, Platinum)
2. 24 customers across all segments with realistic data
3. 2-6 transactions per customer
4. Segments with RFM scores
5. Churn predictions for at-risk customers
6. Loyalty accounts for all customers
7. 6 rewards
8. 5 campaigns with performance metrics
9. Sentiment records
10. 6 recommendations
11. 8 notifications
12. 3 uploaded dataset records

## Security
- SECURITY DEFINER so it can insert all related rows in one call
- Only callable by authenticated users
- Only seeds for the calling user (auth.uid())
- Idempotent: checks if data already exists before seeding
*/

CREATE OR REPLACE FUNCTION seed_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_ids uuid[] := ARRAY[]::uuid[];
  v_c uuid;
  v_tier_ids uuid[] := ARRAY[]::uuid[];
  v_names text[] := ARRAY[
    'Aarav Sharma','Vivaan Patel','Ananya Singh','Diya Gupta','Arjun Mehta',
    'Saanvi Reddy','Krishna Nair','Myra Jain','Reyansh Kumar','Ira Deshmukh',
    'Kabir Joshi','Aadhya Verma','Vihaan Sinha','Anika Bose','Arnav Chauhan',
    'Pari Malhotra','Sai Iyengar','Navya Pillai','Dhruv Saxena','Arya Kapoor',
    'Ishaan Khanna','Kiara Menon','Reyansh Bhat','Tara Agarwal'
  ];
  v_emails text[] := ARRAY[
    'aarav.s@email.com','vivaan.p@email.com','ananya.s@email.com','diya.g@email.com','arjun.m@email.com',
    'saanvi.r@email.com','krishna.n@email.com','myra.j@email.com','reyansh.k@email.com','ira.d@email.com',
    'kabir.j@email.com','aadhya.v@email.com','vihaan.s@email.com','anika.b@email.com','arnav.c@email.com',
    'pari.m@email.com','sai.i@email.com','navya.p@email.com','dhruv.s@email.com','arya.k@email.com',
    'ishaan.k@email.com','kiara.m@email.com','reyansh.b@email.com','tara.a@email.com'
  ];
  v_companies text[] := ARRAY[
    'TechNova Inc','CloudPeak Solutions','DataFlow Systems','Nexus Digital','BrightForge',
    'Quantum Labs','Skyline Ventures','Apex Analytics','Vertex Group','Lumen Tech',
    'Orbit Solutions','Pinnacle Corp','Stellar Dynamics','Zenith Partners','Horizon Tech',
    'Crest Innovations','Pulse Digital','Summit Systems','Echo Enterprises','Cascade Group',
    'Momentum Labs','Radiant Systems','Apex Dynamics','Flux Technologies'
  ];
  v_locations text[] := ARRAY[
    'Mumbai, IN','Delhi, IN','Bangalore, IN','Hyderabad, IN','Chennai, IN',
    'Pune, IN','Kolkata, IN','Ahmedabad, IN','Jaipur, IN','Surat, IN',
    'Lucknow, IN','Nagpur, IN','Indore, IN','Bhopal, IN','Patna, IN',
    'Chandigarh, IN','Coimbatore, IN','Kochi, IN','Visakhapatnam, IN','Nashik, IN'
  ];
  v_segments text[] := ARRAY[
    'Platinum','Gold','Silver','Loyal','Premium','Regular','New','At Risk','Lost'
  ];
  v_colors text[] := ARRAY['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1'];
  v_products text[] := ARRAY[
    'Premium Subscription','Enterprise License','Add-on Module','Support Package',
    'Consulting Service','Training Course','API Access','White-label Plan',
    'Analytics Module','Security Suite'
  ];
  v_categories text[] := ARRAY['Subscription','License','Service','Hardware','Training','Support'];
  v_sentiments text[] := ARRAY['Positive','Neutral','Negative'];
  v_sentiment_contents_pos text[] := ARRAY[
    'Excellent service and support!','Great product, very satisfied.','Love the new features!',
    'Outstanding customer experience.','Highly recommend to others.','Fantastic support team.',
    'Best CRM we have used.','Very impressed with the platform.'
  ];
  v_sentiment_contents_neu text[] := ARRAY[
    'Service is okay, nothing special.','Product meets basic needs.','Average experience overall.',
    'It works as expected.','Decent but could be better.','No complaints, no praise.'
  ];
  v_sentiment_contents_neg text[] := ARRAY[
    'Disappointed with the response time.','Too many bugs lately.','Expected better for the price.',
    'Support was not helpful.','Considering switching providers.'
  ];
  v_rand double precision;
  v_idx integer;
  v_j integer;
  v_churn_prob numeric;
  v_risk text;
  v_sent_score numeric;
  v_sent_label text;
  v_points integer;
  v_tier text;
  v_total_spent numeric;
  v_total_orders integer;
  v_days_ago integer;
  v_status text;
  v_tier_id uuid;
  v_camp_names text[] := ARRAY[
    'Summer Platinum Rewards','Win-Back At-Risk Customers','New User Onboarding Series',
    'Gold Tier Upgrade Drive','Festive Season Special'
  ];
  v_camp_types text[] := ARRAY['Email','SMS','Email','Email','WhatsApp'];
  v_camp_segments text[] := ARRAY['Platinum','At Risk','New','Silver','Gold'];
  v_rec_types text[] := ARRAY[
    'Best Customer','Retention Target','Upselling Opportunity',
    'Cross-selling Opportunity','Discount Recommendation','Campaign Recommendation'
  ];
  v_rec_titles text[] := ARRAY[
    'Top revenue customer identified','High churn risk — retention needed',
    'Premium upgrade opportunity','Complementary product suggestion',
    'Strategic discount for loyalty','Targeted campaign suggested'
  ];
  v_rec_descs text[] := ARRAY[
    'This customer generates 3x the average revenue. Consider exclusive rewards.',
    'Churn probability above 70%. Deploy retention strategy immediately.',
    'Customer spending pattern suggests readiness for premium tier upgrade.',
    'Frequently buys category A — recommend complementary category B products.',
    'Offer 15% discount to re-engage before churn window closes.',
    'Segment shows 40% open rate. Schedule a targeted email campaign.'
  ];
  v_notif_titles text[] := ARRAY[
    'High Churn Risk Alert','New Customer Joined','Membership Upgraded',
    'Campaign Completed','Reward Redemption','Dataset Upload Complete',
    'New Recommendation Available','Weekly Summary Ready'
  ];
  v_notif_msgs text[] := ARRAY[
    '3 customers show high churn risk this week.','A new customer registered from Bangalore.',
    'Pari Malhotra upgraded to Gold tier.','Summer Platinum Rewards campaign finished with 72% success.',
    'Arjun Mehta redeemed 500 points for a discount.','Your dataset customers.csv was processed successfully.',
    'AI engine found 3 new upselling opportunities.','Your weekly performance summary is ready to view.'
  ];
  v_notif_types text[] := ARRAY['Warning','Success','Info','Success','Info','Success','Info','Info'];
  v_notif_icons text[] := ARRAY['alert-triangle','user-plus','arrow-up-circle','check-circle','gift','upload-cloud','lightbulb','file-text'];
  v_col_count integer;
  v_row_count integer;
  v_qual numeric;
  v_dataset_names text[] := ARRAY['customers.csv','transactions_q3.xlsx','customer_feedback.csv'];
  v_existing integer;
BEGIN
  -- Check if already seeded
  SELECT count(*) INTO v_existing FROM customers WHERE user_id = v_user_id;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object('status', 'already_seeded', 'count', v_existing);
  END IF;

  -- Seed membership tiers
  INSERT INTO membership_tiers (user_id, name, min_points, max_points, discount_percent, color, benefits, display_order)
  VALUES (v_user_id, 'Bronze', 0, 999, 0, '#cd7f32', ARRAY['Basic support','Monthly newsletter'], 0) RETURNING id INTO v_tier_id;
  v_tier_ids := array_append(v_tier_ids, v_tier_id);
  INSERT INTO membership_tiers (user_id, name, min_points, max_points, discount_percent, color, benefits, display_order)
  VALUES (v_user_id, 'Silver', 1000, 4999, 5, '#c0c0c0', ARRAY['Priority support','Early access to features','5% discount'], 1) RETURNING id INTO v_tier_id;
  v_tier_ids := array_append(v_tier_ids, v_tier_id);
  INSERT INTO membership_tiers (user_id, name, min_points, max_points, discount_percent, color, benefits, display_order)
  VALUES (v_user_id, 'Gold', 5000, 19999, 10, '#ffd700', ARRAY['24/7 support','Free training sessions','10% discount','Exclusive events'], 2) RETURNING id INTO v_tier_id;
  v_tier_ids := array_append(v_tier_ids, v_tier_id);
  INSERT INTO membership_tiers (user_id, name, min_points, max_points, discount_percent, color, benefits, display_order)
  VALUES (v_user_id, 'Platinum', 20000, NULL, 20, '#e5e4e2', ARRAY['Dedicated account manager','Custom integrations','20% discount','VIP events','Priority feature requests'], 3) RETURNING id INTO v_tier_id;
  v_tier_ids := array_append(v_tier_ids, v_tier_id);

  -- Seed customers
  FOR v_idx IN 1..24 LOOP
    v_rand := random();
    v_total_spent := round((500 + random() * 45000)::numeric, 2);
    v_total_orders := 1 + floor(random() * 50)::integer;
    v_days_ago := 1 + floor(random() * 365)::integer;

    IF v_rand < 0.15 THEN
      v_status := 'Active'; v_tier := 'Platinum'; v_churn_prob := random() * 0.15;
    ELSIF v_rand < 0.35 THEN
      v_status := 'Active'; v_tier := 'Gold'; v_churn_prob := 0.1 + random() * 0.2;
    ELSIF v_rand < 0.55 THEN
      v_status := 'Active'; v_tier := 'Silver'; v_churn_prob := 0.15 + random() * 0.25;
    ELSIF v_rand < 0.75 THEN
      v_status := 'Active'; v_tier := 'Bronze'; v_churn_prob := 0.2 + random() * 0.3;
    ELSIF v_rand < 0.88 THEN
      v_status := 'At Risk'; v_tier := 'Silver'; v_churn_prob := 0.55 + random() * 0.25;
    ELSE
      v_status := 'Lost'; v_tier := 'Bronze'; v_churn_prob := 0.75 + random() * 0.2;
    END IF;

    IF v_churn_prob < 0.3 THEN v_risk := 'Low';
    ELSIF v_churn_prob < 0.6 THEN v_risk := 'Medium';
    ELSE v_risk := 'High'; END IF;

    v_sent_score := round((random() * 100)::numeric, 1);
    IF v_sent_score >= 60 THEN v_sent_label := 'Positive';
    ELSIF v_sent_score >= 35 THEN v_sent_label := 'Neutral';
    ELSE v_sent_label := 'Negative'; END IF;

    v_points := CASE v_tier
      WHEN 'Platinum' THEN 20000 + floor(random() * 30000)::integer
      WHEN 'Gold' THEN 5000 + floor(random() * 15000)::integer
      WHEN 'Silver' THEN 1000 + floor(random() * 4000)::integer
      ELSE floor(random() * 1000)::integer
    END;

    INSERT INTO customers (
      user_id, name, email, phone, company, location, segment, churn_score,
      churn_risk, sentiment_score, sentiment_label, total_spent, total_orders,
      last_purchase_date, status, avatar_color
    ) VALUES (
      v_user_id, v_names[v_idx], v_emails[v_idx],
      '+91 ' || lpad(floor(random() * 9999999999)::integer::text, 10, '0'),
      v_companies[v_idx], v_locations[(v_idx - 1) % array_length(v_locations,1) + 1],
      v_segments[(v_idx - 1) % array_length(v_segments,1) + 1],
      round(v_churn_prob::numeric, 3), v_risk, v_sent_score, v_sent_label,
      v_total_spent, v_total_orders,
      CURRENT_DATE - v_days_ago, v_status,
      v_colors[(v_idx - 1) % array_length(v_colors,1) + 1]
    ) RETURNING id INTO v_c;
    v_customer_ids := array_append(v_customer_ids, v_c);

    -- Transactions
    FOR v_j IN 1..(2 + floor(random() * 5)::integer) LOOP
      INSERT INTO transactions (user_id, customer_id, amount, product_name, category, status, transaction_date)
      VALUES (
        v_user_id, v_c,
        round((50 + random() * 5000)::numeric, 2),
        v_products[(v_j - 1) % array_length(v_products,1) + 1],
        v_categories[(v_j - 1) % array_length(v_categories,1) + 1],
        CASE WHEN random() < 0.95 THEN 'Completed' ELSE 'Refunded' END,
        CURRENT_DATE - floor(random() * 365)::integer
      );
    END LOOP;

    -- Segments
    INSERT INTO segments (user_id, customer_id, segment_name, rfm_score, recency_days, frequency, monetary, cluster_label)
    VALUES (v_user_id, v_c, v_segments[(v_idx - 1) % array_length(v_segments,1) + 1],
      round((1 + random() * 9)::numeric, 1), v_days_ago, v_total_orders, v_total_spent,
      (v_idx - 1) % 5);

    -- Churn predictions for at-risk and above
    IF v_churn_prob >= 0.3 THEN
      INSERT INTO churn_predictions (user_id, customer_id, churn_probability, risk_level, confidence_score, reasons, suggested_strategy)
      VALUES (v_user_id, v_c, round(v_churn_prob::numeric, 3), v_risk, round((0.75 + random() * 0.24)::numeric, 2),
        ARRAY['Decreased purchase frequency','Long gap since last purchase','Low engagement score'],
        CASE v_risk
          WHEN 'High' THEN 'Immediate outreach with personalized retention offer and dedicated account manager.'
          WHEN 'Medium' THEN 'Targeted email campaign with special discount and loyalty bonus points.'
          ELSE 'Monitor closely and include in next win-back campaign cycle.'
        END);
    END IF;

    -- Loyalty
    INSERT INTO loyalty_accounts (user_id, customer_id, points, tier_name, lifetime_points, points_redeemed)
    VALUES (v_user_id, v_c, v_points, v_tier, v_points + floor(random() * 5000)::integer, floor(random() * 2000)::integer);

    -- Sentiments (1-3 per customer)
    FOR v_j IN 1..(1 + floor(random() * 2)::integer) LOOP
      v_sent_label := v_sentiments[(v_j - 1) % array_length(v_sentiments,1) + 1];
      v_sent_score := CASE v_sent_label
        WHEN 'Positive' THEN 60 + random() * 40
        WHEN 'Neutral' THEN 35 + random() * 25
        ELSE random() * 35
      END;
      INSERT INTO sentiments (user_id, customer_id, source, content, sentiment_label, sentiment_score, rating)
      VALUES (v_user_id, v_c,
        CASE WHEN random() < 0.5 THEN 'Review' ELSE 'Feedback' END,
        CASE v_sent_label
          WHEN 'Positive' THEN v_sentiment_contents_pos[1 + floor(random() * array_length(v_sentiment_contents_pos,1))::integer]
          WHEN 'Neutral' THEN v_sentiment_contents_neu[1 + floor(random() * array_length(v_sentiment_contents_neu,1))::integer]
          ELSE v_sentiment_contents_neg[1 + floor(random() * array_length(v_sentiment_contents_neg,1))::integer]
        END,
        v_sent_label, round(v_sent_score::numeric, 1), 1 + floor(random() * 5)::integer);
    END LOOP;
  END LOOP;

  -- Seed rewards
  INSERT INTO rewards (user_id, name, description, points_cost, category, tier_required, active) VALUES
    (v_user_id, '10% Discount Voucher', 'Get 10% off your next purchase', 500, 'Discount', 'Silver', true),
    (v_user_id, 'Free Month Subscription', 'One month free on any plan', 1000, 'Subscription', 'Silver', true),
    (v_user_id, 'Priority Support Access', 'Skip the queue with priority support', 750, 'Service', 'Bronze', true),
    (v_user_id, 'Exclusive Training Session', '1-on-1 training with an expert', 2000, 'Training', 'Gold', true),
    (v_user_id, '20% Discount Voucher', 'Get 20% off your next purchase', 3000, 'Discount', 'Gold', true),
    (v_user_id, 'VIP Event Invitation', 'Exclusive invite to VIP networking event', 5000, 'Event', 'Platinum', true);

  -- Seed campaigns
  FOR v_idx IN 1..5 LOOP
    INSERT INTO campaigns (user_id, name, type, channel, target_segment, status, content, subject_line,
      target_audience_count, open_rate, click_rate, conversion_rate, success_rate, start_date, end_date)
    VALUES (v_user_id, v_camp_names[v_idx], v_camp_types[v_idx], v_camp_types[v_idx],
      v_camp_segments[v_idx],
      CASE WHEN v_idx <= 3 THEN 'Completed' ELSE 'Active' END,
      'Dear valued customer, we have an exclusive offer tailored just for you...',
      CASE v_idx WHEN 1 THEN 'Platinum Rewards Just For You' WHEN 2 THEN 'We Miss You — Special Offer Inside' WHEN 3 THEN 'Welcome to Bandhai AI!' WHEN 4 THEN 'Upgrade to Gold Today' ELSE 'Festive Special Deals' END,
      100 + floor(random() * 500)::integer,
      round((0.25 + random() * 0.45)::numeric, 2),
      round((0.08 + random() * 0.22)::numeric, 2),
      round((0.02 + random() * 0.15)::numeric, 2),
      round((0.4 + random() * 0.45)::numeric, 2),
      CURRENT_DATE - (20 - v_idx * 3),
      CASE WHEN v_idx <= 3 THEN CURRENT_DATE - (15 - v_idx * 3) ELSE NULL END);
  END LOOP;

  -- Seed recommendations
  FOR v_idx IN 1..6 LOOP
    INSERT INTO recommendations (user_id, type, title, description, customer_id, priority, potential_value, status)
    VALUES (v_user_id, v_rec_types[v_idx], v_rec_titles[v_idx], v_rec_descs[v_idx],
      v_customer_ids[(v_idx - 1) % array_length(v_customer_ids,1) + 1],
      CASE WHEN v_idx <= 2 THEN 'High' WHEN v_idx <= 4 THEN 'Medium' ELSE 'Low' END,
      round((1000 + random() * 50000)::numeric, 2),
      'Pending');
  END LOOP;

  -- Seed notifications
  FOR v_idx IN 1..8 LOOP
    INSERT INTO notifications (user_id, title, message, type, read, icon)
    VALUES (v_user_id, v_notif_titles[v_idx], v_notif_msgs[v_idx], v_notif_types[v_idx],
      v_idx > 4, v_notif_icons[v_idx]);
  END LOOP;

  -- Seed uploaded datasets
  FOR v_idx IN 1..3 LOOP
    v_col_count := 5 + floor(random() * 10)::integer;
    v_row_count := 500 + floor(random() * 5000)::integer;
    v_qual := round((70 + random() * 29)::numeric, 1);
    INSERT INTO uploaded_datasets (user_id, filename, file_size, row_count, column_count, columns, quality_score,
      missing_values, duplicates, outliers, status)
    VALUES (v_user_id, v_dataset_names[v_idx],
      v_row_count * v_col_count * 50,
      v_row_count, v_col_count,
      jsonb_build_array('customer_id','name','email','phone','company','revenue','last_purchase','segment','churn_score','loyalty_points'),
      v_qual,
      floor(random() * 100)::integer,
      floor(random() * 50)::integer,
      floor(random() * 80)::integer,
      'Processed');
  END LOOP;

  SELECT count(*) INTO v_existing FROM customers WHERE user_id = v_user_id;
  RETURN jsonb_build_object('status', 'seeded', 'customers', v_existing);
END;
$$;

GRANT EXECUTE ON FUNCTION seed_demo_data() TO authenticated;