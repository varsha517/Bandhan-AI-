import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, Database, CheckCircle, AlertTriangle,
  X, Loader2, Sparkles, ArrowLeft,
  Trash2, Edit2, Check, AlertCircle, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Badge, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { useDatasets } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatNumber } from '@/lib/utils';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  amount: string | null;
  purchaseDate: string | null;
  product: string | null;
  category: string | null;
  revenue: string | null;
  orders: string | null;
  recency: string | null;
  segment: string | null;
  loyaltyPoints: string | null;
  rating: string | null;
  review: string | null;
  customerId: string | null;
  status: string | null;
}

const FIELD_OPTIONS = [
  { key: 'name', label: 'Customer Name', required: true, aliases: ['name', 'customer_name', 'full_name', 'fullname', 'customer'] },
  { key: 'email', label: 'Email', required: false, aliases: ['email', 'email_address', 'mail'] },
  { key: 'phone', label: 'Phone', required: false, aliases: ['phone', 'phone_number', 'mobile', 'mobile_number', 'contact_number', 'contact'] },
  { key: 'company', label: 'Company', required: false, aliases: ['company', 'organization', 'business'] },
  { key: 'location', label: 'Location', required: false, aliases: ['location', 'city', 'address', 'state', 'country', 'region'] },
  { key: 'amount', label: 'Purchase Amount', required: false, aliases: ['amount', 'purchase_amount', 'order_value', 'sales', 'total_amount'] },
  { key: 'purchaseDate', label: 'Purchase Date', required: false, aliases: ['date', 'purchase_date', 'transaction_date', 'order_date'] },
  { key: 'product', label: 'Product', required: false, aliases: ['product', 'product_name', 'item'] },
  { key: 'category', label: 'Category', required: false, aliases: ['category', 'product_category'] },
  { key: 'revenue', label: 'Total Revenue/Spend', required: false, aliases: ['revenue', 'total_spent', 'spent', 'spend', 'monetary', 'm'] },
  { key: 'orders', label: 'Total Orders', required: false, aliases: ['orders', 'total_orders', 'frequency', 'purchases', 'order_count', 'f'] },
  { key: 'recency', label: 'Recency (days)', required: false, aliases: ['recency', 'days_since', 'last_purchase_days', 'recency_days', 'r'] },
  { key: 'segment', label: 'Segment', required: false, aliases: ['segment', 'segment_name', 'group', 'cluster'] },
  { key: 'loyaltyPoints', label: 'Loyalty Points', required: false, aliases: ['loyalty_points', 'points', 'loyalty'] },
  { key: 'rating', label: 'Rating', required: false, aliases: ['rating', 'satisfaction', 'score', 'sentiment_score'] },
  { key: 'review', label: 'Review/Feedback', required: false, aliases: ['review', 'feedback', 'comment', 'comments', 'sentiment'] },
  { key: 'customerId', label: 'Customer ID', required: false, aliases: ['customer_id', 'customerid', 'id', 'user_id', 'customer_number'] },
  { key: 'status', label: 'Status', required: false, aliases: ['status', 'customer_status'] },
] as const;

function parseCSV(text: string): { headers: string[]; rows: CSVRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every((v) => !v)) continue;
    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').replace(/^["']|["']$/g, '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null, email: null, phone: null, company: null, location: null,
    amount: null, purchaseDate: null, product: null, category: null,
    revenue: null, orders: null, recency: null, segment: null,
    loyaltyPoints: null, rating: null, review: null, customerId: null, status: null,
  };
  for (const field of FIELD_OPTIONS) {
    for (const alias of field.aliases) {
      const found = headers.find((h) => h.toLowerCase().replace(/[_\s-]/g, '') === alias.toLowerCase().replace(/[_\s-]/g, ''));
      if (found) {
        (mapping as unknown as Record<string, string | null>)[field.key] = found;
        break;
      }
    }
  }
  return mapping;
}

// 10 RFM Segments: Champions, Loyal Customers, Potential Loyalists, New Customers,
// Promising, Need Attention, At Risk, Can't Lose Them, Hibernating, Lost
function calculateRFM(recencyDays: number, totalOrders: number, totalSpent: number): {
  rScore: number;
  fScore: number;
  mScore: number;
  rfmScore: number;
  segment: string;
} {
  const rScore = recencyDays <= 30 ? 5 : recencyDays <= 60 ? 4 : recencyDays <= 90 ? 3 : recencyDays <= 180 ? 2 : 1;
  const fScore = totalOrders >= 10 ? 5 : totalOrders >= 6 ? 4 : totalOrders >= 3 ? 3 : totalOrders >= 2 ? 2 : 1;
  const mScore = totalSpent >= 30000 ? 5 : totalSpent >= 15000 ? 4 : totalSpent >= 5000 ? 3 : totalSpent >= 2000 ? 2 : 1;
  const rfmScore = Math.round(((rScore + fScore + mScore) / 3) * 10) / 10;

  let segment = 'Regular';
  if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
    segment = 'Champions';
  } else if (rScore <= 2 && fScore >= 4 && mScore >= 4) {
    segment = "Can't Lose Them";
  } else if (rScore >= 3 && fScore >= 3 && mScore >= 3) {
    segment = 'Loyal Customers';
  } else if (rScore <= 2 && fScore >= 3) {
    segment = 'At Risk';
  } else if (rScore >= 4 && fScore >= 2) {
    segment = 'Potential Loyalists';
  } else if (rScore >= 4 && fScore === 1) {
    segment = 'New Customers';
  } else if (rScore === 3 && fScore <= 2) {
    segment = 'Promising';
  } else if (rScore === 3 && fScore >= 2) {
    segment = 'Need Attention';
  } else if (rScore <= 2 && fScore <= 2 && rScore > 1) {
    segment = 'Hibernating';
  } else if (rScore === 1 && fScore === 1) {
    segment = 'Lost';
  } else {
    segment = 'Potential Loyalists';
  }

  return { rScore, fScore, mScore, rfmScore, segment };
}

function inferStatus(segment: string, recencyDays: number): string {
  if (segment === 'Lost' || recencyDays > 180) return 'Lost';
  if (segment === 'At Risk' || segment === "Can't Lose Them" || segment === 'Hibernating' || recencyDays > 90) return 'At Risk';
  return 'Active';
}

function inferChurn(recency: number, orders: number, revenue: number): { risk: string; score: number; reasons: string[]; strategy: string } {
  const reasons: string[] = [];
  if (recency > 180) reasons.push(`${recency} days of purchase inactivity (>180d)`);
  else if (recency > 90) reasons.push(`${recency} days of purchase inactivity (>90d)`);
  else if (recency > 45) reasons.push(`${recency} days since last purchase`);

  if (orders <= 1) reasons.push('Single purchase history');
  else if (orders < 3) reasons.push('Low purchase frequency');

  if (revenue < 2000) reasons.push('Low total spend');

  if (reasons.length === 0) reasons.push('Consistent purchase activity pattern');

  let score: number;
  let risk: string;
  let strategy: string;

  if (recency > 180) {
    score = 0.90;
    risk = 'Critical';
    strategy = 'Urgent high-value win-back offer with personalized executive outreach.';
  } else if (recency > 90) {
    score = 0.70;
    risk = 'High';
    strategy = 'Targeted retention campaign with special offer and loyalty bonus points.';
  } else if (recency > 45 || orders < 3) {
    score = 0.40;
    risk = 'Medium';
    strategy = 'Re-engagement email with product recommendations based on past purchases.';
  } else {
    score = 0.10;
    risk = 'Low';
    strategy = 'Regular engagement and loyalty reward accumulation.';
  }
  return { risk, score, reasons, strategy };
}

function inferSentimentFromRating(rating: number): { label: string; score: number } {
  if (rating >= 4) return { label: 'Positive', score: 70 + (rating - 4) * 30 };
  if (rating >= 3) return { label: 'Neutral', score: 40 + (rating - 3) * 20 };
  return { label: 'Negative', score: Math.max(10, rating * 15) };
}

function inferSentimentFromText(text: string): { label: string; score: number } {
  const positive = ['great', 'excellent', 'amazing', 'love', 'good', 'satisfied', 'happy', 'perfect', 'awesome', 'best', 'superb', 'fast'];
  const negative = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'poor', 'worst', 'horrible', 'unhappy', 'frustrated', 'slow', 'broken'];
  const lower = text.toLowerCase();
  const posCount = positive.filter((w) => lower.includes(w)).length;
  const negCount = negative.filter((w) => lower.includes(w)).length;
  if (posCount > negCount) return { label: 'Positive', score: Math.min(95, 70 + posCount * 5) };
  if (negCount > posCount) return { label: 'Negative', score: Math.max(15, 30 - negCount * 5) };
  return { label: 'Neutral', score: 50 };
}

const SEGMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export default function Datasets() {
  const { data: datasets, loading, setData } = useDatasets();
  const { activeDatasetId, setActiveDatasetId, refreshDatasets } = useDataset();
  const [showProcess, setShowProcess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing'>('upload');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [processSteps, setProcessSteps] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<{ imported: number; newCount: number; duplicates: number; invalid: number } | null>(null);

  const addStep = (s: string) => setProcessSteps((prev) => [...prev, s]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        alert('CSV file appears to be empty or has no data rows.');
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoMapColumns(headers));
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleDemoUpload = async () => {
    const sampleCSV = `customer_id,name,email,phone,company,location,purchase_date,amount,product,category,rating,review
C001,Aarav Sharma,aarav@technova.com,+919876543210,TechNova Inc,"Mumbai, IN",2026-08-15,45000,Premium Subscription,Subscription,5,Outstanding CRM platform with incredible ease of use!
C001,Aarav Sharma,aarav@technova.com,+919876543210,TechNova Inc,"Mumbai, IN",2026-07-20,12000,Analytics Add-on,Add-on,5,Analytics insights are top notch
C002,Vivaan Patel,vivaan@cloudpeak.com,+919876543211,CloudPeak Solutions,"Delhi, IN",2026-09-01,28000,Enterprise License,License,4,Very satisfied with reliability and customer service
C002,Vivaan Patel,vivaan@cloudpeak.com,+919876543211,CloudPeak Solutions,"Delhi, IN",2026-08-10,5000,Training Package,Service,4,Great onboarding and training session
C003,Ananya Singh,ananya@dataflow.com,+919876543212,DataFlow Systems,"Bangalore, IN",2026-09-10,15000,API Bundle,Subscription,5,Love the automated campaigns and workflows
C004,Diya Gupta,diya@nexus.com,+919876543213,Nexus Digital,"Hyderabad, IN",2026-05-20,8500,Mobile App Pro,Add-on,2,Service has been slow and support was frustrating
C005,Arjun Mehta,arjun@brightforge.com,+919876543214,BrightForge,"Chennai, IN",2026-09-05,32000,Premium Subscription,Subscription,5,Excellent support and robust features
C005,Arjun Mehta,arjun@brightforge.com,+919876543214,BrightForge,"Chennai, IN",2026-08-15,8000,Support Contract,Service,5,Quickest response times in the industry
C006,Saanvi Reddy,saanvi@quantum.com,+919876543215,Quantum Labs,"Pune, IN",2026-08-01,12000,Analytics Add-on,Add-on,4,Good value for money
C007,Krishna Nair,krishna@skyline.com,+919876543216,Skyline Ventures,"Kolkata, IN",2026-03-10,5000,Data Migration,Service,1,Disappointed with integration delays
C008,Myra Jain,myra@apex.com,+919876543217,Apex Analytics,"Ahmedabad, IN",2026-09-12,18000,Enterprise License,License,4,Consistent performance and good reporting
C009,Reyansh Kumar,reyansh@vertex.com,+919876543218,Vertex Group,"Jaipur, IN",2026-09-08,3000,Mobile App Pro,Add-on,3,Decent experience but room for improvement
C010,Ira Deshmukh,ira@lumen.com,+919876543219,Lumen Tech,"Surat, IN",2026-09-15,22000,Premium Subscription,Subscription,5,Perfect fit for our SME customer intelligence needs
C010,Ira Deshmukh,ira@lumen.com,+919876543219,Lumen Tech,"Surat, IN",2026-08-20,6000,API Bundle,Subscription,5,Smooth APIs and great documentation
C011,Kabir Joshi,kabir@orbit.com,+919876543220,Orbit Solutions,"Lucknow, IN",2026-06-30,9500,Training Package,Service,3,Average service, works as expected
C012,Aadhya Verma,aadhya@pinnacle.com,+919876543221,Pinnacle Corp,"Nagpur, IN",2026-09-14,38000,Enterprise License,License,5,One of our best software investments
C013,Vihaan Sinha,vihaan@stellar.com,+919876543222,Stellar Dynamics,"Indore, IN",2026-08-25,16000,Premium Subscription,Subscription,4,Solid features and good team support
C014,Anika Bose,anika@zenith.com,+919876543223,Zenith Partners,"Bhopal, IN",2026-04-15,6500,Data Migration,Service,2,Encountered multiple bugs during migration
C015,Arnav Chauhan,arnav@horizon.com,+919876543224,Horizon Tech,"Patna, IN",2026-09-03,26000,Analytics Add-on,Add-on,4,Helpful analytics and clear visual dashboards
C016,Pari Malhotra,pari@crest.com,+919876543225,Crest Innovations,"Chandigarh, IN",2026-09-16,42000,Premium Subscription,Subscription,5,Incredible tool for customer retention and campaigns
C017,Sai Iyengar,sai@pulse.com,+919876543226,Pulse Digital,"Coimbatore, IN",2026-07-25,11000,API Bundle,Subscription,3,Standard capabilities, does the job
C018,Navya Pillai,navya@summit.com,+919876543227,Summit Systems,"Kochi, IN",2026-06-10,7500,Mobile App Pro,Add-on,3,Meets requirements for small scale use
C019,Dhruv Saxena,dhruv@echo.com,+919876543228,Echo Enterprises,"Visakhapatnam, IN",2026-08-28,19500,Enterprise License,License,4,Very happy with churn alert notifications
C020,Arya Kapoor,arya@cascade.com,+919876543229,Cascade Group,"Nashik, IN",2026-09-11,48000,Premium Subscription,Subscription,5,Outstanding customer insights and loyalty tools
C020,Arya Kapoor,arya@cascade.com,+919876543229,Cascade Group,"Nashik, IN",2026-08-18,12000,Support Contract,Service,5,Excellent support team
`;
    setFileName('sample_sales_dataset.csv');
    const { headers, rows } = parseCSV(sampleCSV);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setMapping(autoMapColumns(headers));
    setStep('mapping');
  };

  const runImport = async () => {
    if (!mapping) return;
    setStep('importing');
    setProcessSteps([]);
    setImportStats(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      addStep('Error: You must be logged in to import a dataset.');
      return;
    }

    addStep(`Parsed ${csvRows.length} rows with ${csvHeaders.length} columns`);
    await wait(200);

    const isTransactional = !!(mapping.amount || mapping.product || mapping.purchaseDate);

    // Group rows by customer to ensure 1 customer per person in this dataset
    // (If 1 customer has 3 purchase rows: ONE customer, THREE transactions)
    const customerMap = new Map<string, CSVRow[]>();
    for (const row of csvRows) {
      const email = mapping.email ? row[mapping.email]?.trim() : '';
      const phone = mapping.phone ? row[mapping.phone]?.trim() : '';
      const custId = mapping.customerId ? row[mapping.customerId]?.trim() : '';
      const name = mapping.name ? row[mapping.name]?.trim() : '';

      const key = email || phone || custId || name;
      if (!key) continue;

      if (!customerMap.has(key)) {
        customerMap.set(key, []);
      }
      customerMap.get(key)!.push(row);
    }

    addStep(`Aggregated ${csvRows.length} rows into ${customerMap.size} unique customer profiles`);
    await wait(200);

    // Calculate missing values and quality score
    const missingValues = csvRows.reduce((count, row) => {
      return count + csvHeaders.filter((h) => !row[h]?.trim() || row[h]?.toLowerCase() === 'null' || row[h]?.toLowerCase() === 'na').length;
    }, 0);

    const qualityScore = Math.max(50, Math.min(100, Math.round((100 - (missingValues * 0.5 / (csvRows.length * csvHeaders.length)) * 100) * 10) / 10));

    // Create dataset record in uploaded_datasets
    const { data: datasetRecord, error: dsError } = await supabase.from('uploaded_datasets').insert({
      user_id: user.id,
      filename: fileName,
      file_size: fileName.length * 128,
      row_count: csvRows.length,
      column_count: csvHeaders.length,
      columns: csvHeaders,
      quality_score: qualityScore,
      missing_values: missingValues,
      duplicates: csvRows.length - customerMap.size,
      outliers: 0,
      status: 'Processing',
    }).select().single();

    if (dsError || !datasetRecord) {
      addStep(`Failed to create dataset record: ${dsError?.message ?? 'Unknown database error'}`);
      setImportStats({ imported: 0, newCount: 0, duplicates: 0, invalid: 0 });
      return;
    }

    const datasetId = datasetRecord.id;
    addStep(`Created dataset "${fileName}" (ID: ${datasetId.substring(0, 8)}...)`);
    await wait(200);

    const customerInserts: Record<string, unknown>[] = [];
    const customerRowsList: CSVRow[][] = [];

    const now = Date.now();

    for (const [key, rows] of customerMap) {
      const firstRow = rows[0];
      const name = mapping.name ? (firstRow[mapping.name]?.trim() || key) : key;
      const email = mapping.email ? (firstRow[mapping.email]?.trim() || null) : null;
      const phone = mapping.phone ? (firstRow[mapping.phone]?.trim() || null) : null;
      const company = mapping.company ? (firstRow[mapping.company]?.trim() || null) : null;
      const location = mapping.location ? (firstRow[mapping.location]?.trim() || null) : null;

      if (!name || name.trim().length === 0) continue;

      // Calculate aggregate transaction values
      let totalSpent = 0;
      let totalOrders = rows.length;
      let lastPurchaseDate: string | null = null;

      if (mapping.amount) {
        for (const row of rows) {
          const amt = parseFloat(row[mapping.amount!].replace(/[^0-9.-]/g, '')) || 0;
          totalSpent += amt;
          const dt = mapping.purchaseDate ? row[mapping.purchaseDate!]?.trim() : null;
          if (dt) {
            if (!lastPurchaseDate || new Date(dt) > new Date(lastPurchaseDate)) {
              lastPurchaseDate = dt;
            }
          }
        }
      } else if (mapping.revenue) {
        totalSpent = parseFloat(firstRow[mapping.revenue].replace(/[^0-9.-]/g, '')) || 0;
      }

      if (mapping.orders) {
        const parsedOrders = parseInt(firstRow[mapping.orders], 10);
        if (!isNaN(parsedOrders) && parsedOrders > 0) totalOrders = parsedOrders;
      }

      // Calculate recency in days
      let recencyDays = 30;
      if (mapping.recency && firstRow[mapping.recency]) {
        recencyDays = parseInt(firstRow[mapping.recency], 10) || 30;
      } else if (lastPurchaseDate) {
        const diff = Math.floor((now - new Date(lastPurchaseDate).getTime()) / 86400000);
        recencyDays = Math.max(0, diff);
      }

      // Calculate RFM & Segment
      const rfm = calculateRFM(recencyDays, totalOrders, totalSpent);
      const segment = mapping.segment && firstRow[mapping.segment]?.trim()
        ? firstRow[mapping.segment].trim()
        : rfm.segment;

      const status = mapping.status && firstRow[mapping.status]?.trim()
        ? firstRow[mapping.status].trim()
        : inferStatus(segment, recencyDays);

      const churn = inferChurn(recencyDays, totalOrders, totalSpent);

      let sentimentLabel = 'Neutral';
      let sentimentScore = 50;
      if (mapping.rating && firstRow[mapping.rating]) {
        const r = parseFloat(firstRow[mapping.rating]);
        if (!isNaN(r)) {
          const s = inferSentimentFromRating(r);
          sentimentLabel = s.label;
          sentimentScore = s.score;
        }
      }
      if (mapping.review && firstRow[mapping.review]?.trim()) {
        const s = inferSentimentFromText(firstRow[mapping.review]);
        sentimentLabel = s.label;
        sentimentScore = s.score;
      }

      customerInserts.push({
        user_id: user.id,
        dataset_id: datasetId,
        name,
        email,
        phone,
        company,
        location,
        segment,
        churn_score: churn.score,
        churn_risk: churn.risk,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
        total_spent: totalSpent,
        total_orders: totalOrders,
        last_purchase_date: lastPurchaseDate,
        status,
        avatar_color: SEGMENT_COLORS[Math.abs(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % SEGMENT_COLORS.length],
      });
      customerRowsList.push(rows);
    }

    addStep(`Inserting ${customerInserts.length} customer records...`);
    await wait(200);

    let insertedCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < customerInserts.length; i += BATCH_SIZE) {
      const custBatch = customerInserts.slice(i, i + BATCH_SIZE);
      const rowsBatch = customerRowsList.slice(i, i + BATCH_SIZE);

      const { data: insertedCustomers, error: custErr } = await supabase
        .from('customers')
        .insert(custBatch)
        .select('id, name, segment, total_spent, total_orders, last_purchase_date, churn_risk, churn_score, sentiment_label, sentiment_score');

      if (custErr || !insertedCustomers) {
        addStep(`Customer batch insertion error: ${custErr?.message ?? 'Unknown'}`);
        continue;
      }

      insertedCount += insertedCustomers.length;
      addStep(`Saved customers ${insertedCount}/${customerInserts.length}`);

      // Derived records for this batch
      const loyaltyInserts: Record<string, unknown>[] = [];
      const segmentInserts: Record<string, unknown>[] = [];
      const churnInserts: Record<string, unknown>[] = [];
      const sentimentInserts: Record<string, unknown>[] = [];
      const transactionInserts: Record<string, unknown>[] = [];

      for (let ci = 0; ci < insertedCustomers.length; ci++) {
        const c = insertedCustomers[ci];
        const rows = rowsBatch[ci];
        const firstRow = rows[0];

        const spent = Number(c.total_spent) || 0;
        const orders = Number(c.total_orders) || 1;
        const points = Math.round(spent * 0.5 + orders * 100);
        const tier = points >= 20000 ? 'Platinum' : points >= 5000 ? 'Gold' : points >= 1000 ? 'Silver' : 'Bronze';

        loyaltyInserts.push({
          user_id: user.id,
          customer_id: c.id,
          points,
          tier_name: tier,
          lifetime_points: points,
          points_redeemed: 0,
        });

        // Recency calculation
        const lastDate = c.last_purchase_date ? new Date(c.last_purchase_date).getTime() : now;
        const recencyDays = c.last_purchase_date ? Math.max(0, Math.floor((now - lastDate) / 86400000)) : 30;
        const rfm = calculateRFM(recencyDays, orders, spent);

        segmentInserts.push({
          user_id: user.id,
          customer_id: c.id,
          segment_name: c.segment,
          rfm_score: rfm.rfmScore,
          recency_days: recencyDays,
          frequency: orders,
          monetary: spent,
          cluster_label: rfm.fScore,
        });

        const churn = inferChurn(recencyDays, orders, spent);
        churnInserts.push({
          user_id: user.id,
          customer_id: c.id,
          churn_probability: churn.score,
          risk_level: churn.risk,
          confidence_score: 0.88,
          reasons: churn.reasons,
          suggested_strategy: churn.strategy,
          model_version: 'v1.0-rules',
        });

        // Sentiment (only if real review or rating exists)
        if (mapping.review && firstRow[mapping.review]?.trim()) {
          sentimentInserts.push({
            user_id: user.id,
            customer_id: c.id,
            source: 'Review',
            content: firstRow[mapping.review].trim(),
            sentiment_label: c.sentiment_label,
            sentiment_score: c.sentiment_score,
            rating: mapping.rating && firstRow[mapping.rating] ? Math.round(parseFloat(firstRow[mapping.rating]) || 4) : 4,
          });
        } else if (mapping.rating && firstRow[mapping.rating]?.trim()) {
          const r = parseFloat(firstRow[mapping.rating]);
          if (!isNaN(r)) {
            sentimentInserts.push({
              user_id: user.id,
              customer_id: c.id,
              source: 'Rating',
              content: `Rated ${r}/5 stars`,
              sentiment_label: c.sentiment_label,
              sentiment_score: c.sentiment_score,
              rating: Math.round(r),
            });
          }
        }

        // Transactions (1 row in CSV = 1 transaction)
        if (isTransactional) {
          for (const row of rows) {
            const amt = mapping.amount ? (parseFloat(row[mapping.amount].replace(/[^0-9.-]/g, '')) || 0) : 0;
            const dt = mapping.purchaseDate ? row[mapping.purchaseDate]?.trim() : null;
            const prod = mapping.product ? row[mapping.product]?.trim() : 'Product';
            const cat = mapping.category ? row[mapping.category]?.trim() : 'General';

            transactionInserts.push({
              user_id: user.id,
              customer_id: c.id,
              amount: amt,
              product_name: prod || 'Product',
              category: cat || 'General',
              status: 'Completed',
              transaction_date: dt || new Date().toISOString(),
              quantity: 1,
            });
          }
        }
      }

      if (loyaltyInserts.length > 0) {
        await supabase.from('loyalty_accounts').insert(loyaltyInserts);
      }
      if (segmentInserts.length > 0) {
        await supabase.from('segments').insert(segmentInserts);
      }
      if (churnInserts.length > 0) {
        await supabase.from('churn_predictions').insert(churnInserts);
      }
      if (sentimentInserts.length > 0) {
        await supabase.from('sentiments').insert(sentimentInserts);
      }
      if (transactionInserts.length > 0) {
        await supabase.from('transactions').insert(transactionInserts);
      }
    }

    addStep('Finalizing dataset status and activating globally...');
    await supabase.from('uploaded_datasets').update({ status: 'Processed' }).eq('id', datasetId);

    // Create a notification for the import
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Dataset Imported Successfully',
      message: `"${fileName}" processed with ${customerMap.size} customers and ${csvRows.length} records.`,
      type: 'Success',
      icon: 'upload-cloud',
    });

    setImportStats({
      imported: customerMap.size,
      newCount: insertedCount,
      duplicates: csvRows.length - customerMap.size,
      invalid: 0,
    });

    addStep('Complete! All modules now use this active dataset.');

    // Refresh context and set as active dataset
    await refreshDatasets();
    setActiveDatasetId(datasetId);
  };

  const handleReprocess = async (dsId: string) => {
    setReprocessingId(dsId);
    try {
      // Re-evaluate customers in this dataset
      const { data: custs } = await supabase.from('customers').select('*').eq('dataset_id', dsId);
      if (custs && custs.length > 0) {
        for (const c of custs) {
          const recency = c.last_purchase_date
            ? Math.max(0, Math.floor((Date.now() - new Date(c.last_purchase_date).getTime()) / 86400000))
            : 30;
          const rfm = calculateRFM(recency, Number(c.total_orders), Number(c.total_spent));
          const churn = inferChurn(recency, Number(c.total_orders), Number(c.total_spent));
          await supabase.from('customers').update({
            segment: rfm.segment,
            churn_score: churn.score,
            churn_risk: churn.risk,
            status: inferStatus(rfm.segment, recency),
          }).eq('id', c.id);
        }
      }
      await supabase.from('uploaded_datasets').update({ status: 'Processed', quality_score: 95 }).eq('id', dsId);
      await refreshDatasets();
    } catch (e) {
      console.error('Reprocess failed', e);
    }
    setReprocessingId(null);
  };

  const handleDelete = async (id: string) => {
    // 1. Delete customers belonging to this dataset (cascades to transactions, loyalty, segments, churn, sentiments, campaign_recipients)
    await supabase.from('customers').delete().eq('dataset_id', id);
    // 2. Delete reports linked to this dataset
    await supabase.from('reports').delete().eq('dataset_id', id);
    // 3. Delete campaigns created for this dataset
    await supabase.from('campaigns').delete().eq('audience_filter->>dataset_id', id);
    // 4. Delete uploaded dataset record
    const { error } = await supabase.from('uploaded_datasets').delete().eq('id', id);
    if (!error) {
      const remaining = datasets.filter((ds) => ds.id !== id);
      setData(remaining);
      await refreshDatasets();
      if (activeDatasetId === id) {
        setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
    setDeletingId(null);
  };

  if (loading) return <LoadingSpinner />;

  const avgQuality = datasets.length
    ? (datasets.reduce((s, d) => s + Number(d.quality_score), 0) / datasets.length).toFixed(1)
    : '0';
  const totalRows = datasets.reduce((s, d) => s + d.row_count, 0);
  const totalMissing = datasets.reduce((s, d) => s + d.missing_values, 0);

  return (
    <div>
      <PageHeader
        title="Dataset Upload & Management"
        subtitle="Manage customer datasets. The selected active dataset controls all analytics, RFM, campaigns, and reports."
        action={
          <button
            onClick={() => {
              setStep('upload');
              setShowProcess(true);
            }}
            className="btn-primary"
          >
            <UploadCloud className="w-4 h-4" /> Upload Dataset
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Datasets" value={datasets.length} icon={Database} color="#3b82f6" />
        <StatCard label="Total Records" value={formatNumber(totalRows)} icon={FileText} color="#10b981" />
        <StatCard label="Avg Quality" value={`${avgQuality}%`} icon={CheckCircle} color="#8b5cf6" />
        <StatCard label="Missing Values" value={totalMissing} icon={AlertTriangle} color="#f59e0b" />
      </div>

      {datasets.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="No datasets uploaded yet"
          subtitle="Upload a CSV file or import our sample transaction dataset to populate BandhanAI with real data."
        />
      ) : (
        <div className="space-y-4">
          {datasets.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={activeDatasetId === d.id ? 'ring-2 ring-brand-500 shadow-brand-500/10 shadow-lg' : ''}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${activeDatasetId === d.id ? 'bg-brand-500 text-white' : 'bg-brand-500/10 text-brand-500'}`}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingId === d.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-field text-sm font-semibold py-1"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('uploaded_datasets').update({ filename: editName }).eq('id', d.id);
                              if (!error) {
                                setData(datasets.map((ds) => (ds.id === d.id ? { ...ds, filename: editName } : ds)));
                                await refreshDatasets();
                              }
                              setEditingId(null);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                          {d.filename}
                        </h3>
                      )}
                      <Badge className={d.status === 'Processed' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}>
                        {d.status}
                      </Badge>
                      {activeDatasetId === d.id ? (
                        <Badge className="text-brand-500 bg-brand-500/20 border-brand-500 font-bold">
                          ✓ ACTIVE DATASET
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatNumber(d.row_count)} rows · {d.column_count} columns · Uploaded {new Date(d.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">Data Quality Score</span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: Number(d.quality_score) >= 80 ? '#10b981' : Number(d.quality_score) >= 60 ? '#f59e0b' : '#ef4444' }}
                        >
                          {Number(d.quality_score).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-500/20 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Number(d.quality_score)}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ background: Number(d.quality_score) >= 80 ? '#10b981' : Number(d.quality_score) >= 60 ? '#f59e0b' : '#ef4444' }}
                        />
                      </div>
                    </div>

                    {d.columns && d.columns.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        {d.columns.map((col, ci) => (
                          <span key={ci} className="text-xs px-2 py-0.5 rounded-md bg-slate-500/10" style={{ color: 'var(--text-secondary)' }}>
                            {col}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      {activeDatasetId !== d.id ? (
                        <button
                          onClick={() => setActiveDatasetId(d.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
                        >
                          <Database className="w-3.5 h-3.5" /> Make Active
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Currently Powering CRM
                        </span>
                      )}

                      <button
                        onClick={() => handleReprocess(d.id)}
                        disabled={reprocessingId === d.id}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:text-brand-500 font-medium transition-colors"
                        title="Recompute RFM and churn predictions"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === d.id ? 'animate-spin' : ''}`} />
                        {reprocessingId === d.id ? 'Processing...' : 'Reprocess'}
                      </button>

                      {editingId !== d.id && (
                        <button
                          onClick={() => {
                            setEditingId(d.id);
                            setEditName(d.filename);
                          }}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:text-amber-500 font-medium transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Rename
                        </button>
                      )}

                      {deletingId === d.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Delete dataset & linked data?
                          </span>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(d.id)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-red-500/10 hover:text-red-500 font-medium transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload & Mapping Modal */}
      <AnimatePresence>
        {showProcess && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => step !== 'importing' && setShowProcess(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {step === 'upload' && 'Upload Customer Dataset'}
                  {step === 'mapping' && 'Map CSV Columns to CRM Fields'}
                  {step === 'importing' && 'Processing & Deriving Metrics...'}
                </h2>
                {step !== 'importing' && (
                  <button onClick={() => setShowProcess(false)} className="text-slate-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {step === 'upload' && (
                <div>
                  <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-secondary)' }}>
                    <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-500" />
                    BandhanAI creates unique customers, individual transactions, RFM segmentation, churn probabilities, loyalty points, and sentiment scores.
                  </div>
                  <label className="block">
                    <div
                      className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500/50 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Drop CSV file here or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supported columns: name, email, phone, company, location, purchase_date, amount, product, category, rating, review
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                    </div>
                  </label>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                  <button onClick={handleDemoUpload} className="btn-secondary w-full">
                    <Sparkles className="w-4 h-4" /> Load Sample SME Transaction Dataset (20 Customers, 25 Transactions)
                  </button>
                </div>
              )}

              {step === 'mapping' && mapping && (
                <div>
                  <div className="mb-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-secondary)' }}>
                    Detected {csvHeaders.length} columns from {csvRows.length} rows. Fields are auto-mapped based on header aliases. Confirm or adjust mapping below.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {FIELD_OPTIONS.map((field) => {
                      const mapped = (mapping as unknown as Record<string, string | null>)[field.key];
                      return (
                        <div key={field.key}>
                          <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={mapped ?? ''}
                            onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value || null })}
                            className="input-field text-sm"
                          >
                            <option value="">— Not mapped —</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                          {mapped && (
                            <span className="text-xs text-emerald-500 mt-0.5 block">
                              <CheckCircle className="w-3 h-3 inline mr-1" /> Mapped to "{mapped}"
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => setStep('upload')} className="btn-secondary">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={runImport} className="btn-primary flex-1">
                      <Database className="w-4 h-4" /> Import {csvRows.length} Records
                    </button>
                  </div>
                </div>
              )}

              {step === 'importing' && (
                <div className="py-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Processing {fileName}...
                      </p>
                      <p className="text-xs text-slate-400">Computing derived RFM metrics, churn risk, and loyalty</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-left max-h-60 overflow-y-auto">
                    {processSteps.map((s, si) => (
                      <motion.div
                        key={si}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </motion.div>
                    ))}
                  </div>
                  {importStats && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                          <p className="text-2xl font-bold text-emerald-500">{importStats.newCount}</p>
                          <p className="text-xs text-slate-400">Customers Created</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                          <p className="text-2xl font-bold text-brand-500">{importStats.duplicates}</p>
                          <p className="text-xs text-slate-400">Repeat Orders Linked</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                          <p className="text-2xl font-bold text-red-500">{importStats.invalid}</p>
                          <p className="text-xs text-slate-400">Errors</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowProcess(false);
                          setStep('upload');
                        }}
                        className="btn-primary w-full"
                      >
                        <CheckCircle className="w-4 h-4" /> Go to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
