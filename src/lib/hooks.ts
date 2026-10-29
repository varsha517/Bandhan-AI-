import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  Customer, Transaction, Campaign, CampaignRecipient, Notification, Recommendation,
  Sentiment, Segment, ChurnPrediction, LoyaltyAccount, MembershipTier,
  Reward, UploadedDataset, Report,
} from './types';

export function useTable<T>(table: string, select = '*') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: result } = await supabase.from(table).select(select);
      if (mounted) {
        setData((result as T[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [table, select]);

  return { data, loading, setData };
}

export function useCustomers(datasetId?: string | null) {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (datasetId) query = query.eq('dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as Customer[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useTransactions(datasetId?: string | null) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('transactions').select('*, customer:customers!inner(*)').order('transaction_date', { ascending: false });
      if (datasetId) query = query.eq('customer.dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as Transaction[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useCampaigns(datasetId?: string | null) {
  const [data, setData] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (datasetId === null) {
      setData([]);
      setLoading(false);
      return;
    }
    let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (datasetId) {
      // Use containedBy/contains on JSONB column for dataset_id filter
      query = query.contains('audience_filter', { dataset_id: datasetId });
    }
    const { data: result } = await query;
    setData((result as Campaign[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (datasetId) {
        query = query.contains('audience_filter', { dataset_id: datasetId });
      }
      const { data: result } = await query;
      if (mounted) {
        setData((result as Campaign[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData, refetch: fetchCampaigns };
}

export function useNotifications() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: result } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (mounted) {
        setData((result as Notification[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { data, loading, setData };
}

export function useRecommendations() {
  return useTable<Recommendation>('recommendations');
}

export function useSentiments(datasetId?: string | null) {
  const [data, setData] = useState<Sentiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('sentiments').select('*, customer:customers!inner(*)').order('created_at', { ascending: false });
      if (datasetId) query = query.eq('customer.dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as Sentiment[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useSegments(datasetId?: string | null) {
  const [data, setData] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('segments').select('*, customer:customers!inner(*)');
      if (datasetId) query = query.eq('customer.dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as Segment[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useChurnPredictions(datasetId?: string | null) {
  const [data, setData] = useState<ChurnPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('churn_predictions').select('*, customer:customers!inner(*)');
      if (datasetId) query = query.eq('customer.dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as ChurnPrediction[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useLoyaltyAccounts(datasetId?: string | null) {
  const [data, setData] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('loyalty_accounts').select('*, customer:customers!inner(*)');
      if (datasetId) query = query.eq('customer.dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as LoyaltyAccount[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useMembershipTiers() {
  return useTable<MembershipTier>('membership_tiers');
}

export function useRewards() {
  return useTable<Reward>('rewards');
}

export function useDatasets() {
  const [data, setData] = useState<UploadedDataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: result } = await supabase.from('uploaded_datasets').select('*').order('created_at', { ascending: false });
      if (mounted) {
        setData((result as UploadedDataset[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { data, loading, setData };
}

export function useReports(datasetId?: string | null) {
  const [data, setData] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (datasetId === null) {
        if (mounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (datasetId) query = query.eq('dataset_id', datasetId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as Report[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [datasetId]);

  return { data, loading, setData };
}

export function useCampaignRecipients(campaignId?: string | null) {
  const [data, setData] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipients = async () => {
    let query = supabase.from('campaign_recipients').select('*, customer:customers(*)').order('created_at', { ascending: false });
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data: result } = await query;
    setData((result as CampaignRecipient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      let query = supabase.from('campaign_recipients').select('*, customer:customers(*)').order('created_at', { ascending: false });
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data: result } = await query;
      if (mounted) {
        setData((result as CampaignRecipient[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [campaignId]);

  return { data, loading, setData, refetch: fetchRecipients };
}
