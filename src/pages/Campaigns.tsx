import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, MessageSquare, Smartphone, Plus, X, Send, Sparkles, Loader2,
  Check, Eye, Target, Users, AlertCircle, ArrowRight, ArrowLeft,
  CheckCircle, XCircle, Clock, Zap, TestTube, Search, Calendar,
  ShieldAlert, RefreshCw,
} from 'lucide-react';
import { getFunctionErrorMessage, invokeSendCampaign, supabase } from '@/lib/supabase';
import { PageHeader, Card, Badge, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { useCampaigns, useCustomers, useCampaignRecipients } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatNumber, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import type { Campaign as CampaignType, Customer } from '@/lib/types';

const CHANNELS = ['Email', 'SMS', 'WhatsApp'] as const;
const AUDIENCE_TYPES = ['All Customers', 'RFM Segment', 'Churn Risk', 'Loyalty Tier'] as const;
const SEGMENTS = ['Champions', 'Loyal', 'Potential Loyalist', 'New', 'Premium', 'Regular', 'At Risk', 'Hibernating'];
const RISK_LEVELS = ['High', 'Medium', 'Low'];
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (/^[1-9]\d{6,14}$/.test(digits)) {
      return cleaned;
    }
    return null;
  }
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }
  if (/^[1-9]\d{10,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function personalizeMessage(template: string, c: Customer & { tier_name?: string }): string {
  const safeName = c.name || 'Valued Customer';
  const firstName = safeName.split(' ')[0] ?? safeName;
  const lastName = safeName.split(' ').slice(1).join(' ') ?? '';
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, lastName)
    .replace(/\{\{name\}\}/g, safeName)
    .replace(/\{\{email\}\}/g, c.email ?? '')
    .replace(/\{\{phone\}\}/g, c.phone ?? '')
    .replace(/\{\{segment\}\}/g, c.segment ?? 'Standard')
    .replace(/\{\{loyalty_tier\}\}/g, c.tier_name ?? 'Bronze')
    .replace(/\{\{total_spend\}\}/g, Number(c.total_spent || 0).toLocaleString());
}

function hasValidContact(c: Customer, channel: string): boolean {
  if (channel === 'Email') return !!c.email && !c.email_opt_out && isValidEmail(c.email);
  if (channel === 'SMS') return !!c.phone && !c.sms_opt_out && !!normalizePhone(c.phone);
  if (channel === 'WhatsApp') return !!c.phone && !c.whatsapp_opt_out && !!normalizePhone(c.phone);
  return false;
}

function getChannelIcon(channel: string) {
  if (channel === 'Email') return Mail;
  if (channel === 'SMS') return Smartphone;
  return MessageSquare;
}

export default function Campaigns() {
  const { activeDatasetId, activeDataset } = useDataset();
  const { data: campaigns, loading, setData, refetch: refetchCampaigns } = useCampaigns(activeDatasetId);
  const { data: customers } = useCustomers(activeDatasetId);
  const { data: allRecipients, refetch: refetchRecipients } = useCampaignRecipients();
  const [showGen, setShowGen] = useState(false);
  const [showDetail, setShowDetail] = useState<CampaignType | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [showTestSms, setShowTestSms] = useState(false);

  // Isolate recipients to visible dataset campaigns
  const campaignIds = useMemo(() => new Set(campaigns.map((c) => c.id)), [campaigns]);
  const datasetRecipients = useMemo(() => allRecipients.filter((r) => campaignIds.has(r.campaign_id)), [allRecipients, campaignIds]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const completed = campaigns.filter((c) => c.status === 'sent' || c.status === 'Completed').length;
    const active = campaigns.filter((c) => c.status === 'sending' || c.status === 'Sending' || c.status === 'Active').length;
    const totalSent = datasetRecipients.filter((r) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
    const totalFailed = datasetRecipients.filter((r) => r.status === 'failed').length;
    return { total, completed, active, totalSent, totalFailed };
  }, [campaigns, datasetRecipients]);

  const recipientsByCampaign = useMemo(() => {
    const map: Record<string, typeof allRecipients> = {};
    datasetRecipients.forEach((r) => {
      if (!map[r.campaign_id]) map[r.campaign_id] = [];
      map[r.campaign_id].push(r);
    });
    return map;
  }, [datasetRecipients]);

  const handleRefresh = async () => {
    await Promise.all([refetchCampaigns(), refetchRecipients()]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={`Create and send personalized marketing campaigns via Email and SMS ${activeDataset ? `· Dataset: ${activeDataset.filename}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="btn-secondary p-2" title="Refresh Campaigns"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setShowTest(true)} className="btn-secondary"><TestTube className="w-4 h-4" /> Test Email</button>
            <button onClick={() => setShowTestSms(true)} className="btn-secondary"><Smartphone className="w-4 h-4" /> Test SMS</button>
            <button onClick={() => setShowGen(true)} disabled={!activeDatasetId} className="btn-primary disabled:opacity-50"><Plus className="w-4 h-4" /> New Campaign</button>
          </div>
        }
      />

      {!activeDatasetId && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-500">No active dataset selected</p>
              <p className="text-xs text-slate-400">Please select or upload a dataset to isolate customer recipients and manage campaigns.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Campaigns" value={stats.total} icon={Mail} color="#3b82f6" />
        <StatCard label="Successful Campaigns" value={stats.completed} icon={Check} color="#10b981" />
        <StatCard label="Messages Delivered" value={formatNumber(stats.totalSent)} icon={Send} color="#06b6d4" />
        <StatCard label="Delivery Failures" value={stats.totalFailed} icon={XCircle} color="#ef4444" />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState icon={Mail} title="No campaigns yet" subtitle={activeDataset ? `Create your first campaign for dataset "${activeDataset.filename}"` : "Select a dataset and create your first campaign"} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((c, i) => {
            const recipients = recipientsByCampaign[c.id] ?? [];
            const sent = recipients.filter((r) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
            const failed = recipients.filter((r) => r.status === 'failed').length;
            const delivered = recipients.filter((r) => r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
            const opened = recipients.filter((r) => r.status === 'opened' || r.status === 'clicked').length;
            const clicked = recipients.filter((r) => r.status === 'clicked').length;
            const Icon = getChannelIcon(c.channel);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                        <p className="text-xs text-slate-400">
                          {c.channel} · {c.target_segment ?? c.audience_type ?? 'All'} · <Calendar className="w-3 h-3 inline mr-0.5" />{formatDateTime(c.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                  </div>
                  {c.subject_line && <p className="text-sm mb-2 italic" style={{ color: 'var(--text-secondary)' }}>"{c.subject_line}"</p>}
                  {!c.subject_line && c.content && <p className="text-xs mb-2 text-slate-400 line-clamp-1">"{c.content}"</p>}
                  {recipients.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <Metric icon={Send} label="Sent" value={String(sent)} color="#3b82f6" />
                      <Metric icon={Check} label="Delivered" value={String(delivered)} color="#10b981" />
                      <Metric icon={Eye} label="Opened" value={String(opened)} color="#06b6d4" />
                      <Metric icon={XCircle} label="Failed" value={String(failed)} color="#ef4444" />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>{formatNumber(c.target_audience_count)} target recipients</p>
                  )}
                  <button onClick={() => setShowDetail(c)} className="flex items-center gap-1 text-xs mt-3 text-brand-500 hover:underline">
                    View Details <ArrowRight className="w-3 h-3" />
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showGen && (
          <CampaignWizard
            customers={customers}
            activeDatasetId={activeDatasetId}
            activeDatasetName={activeDataset?.filename ?? 'Current Dataset'}
            onClose={() => setShowGen(false)}
            onCreated={(c) => {
              setData([c, ...campaigns]);
              setShowGen(false);
              refetchCampaigns();
              refetchRecipients();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetail && <CampaignDetailModal campaign={showDetail} recipients={recipientsByCampaign[showDetail.id] ?? []} onClose={() => setShowDetail(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showTest && <TestEmailModal onClose={() => setShowTest(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showTestSms && <TestSmsModal onClose={() => setShowTestSms(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

// ============ MULTI-STEP CAMPAIGN WIZARD ============

interface WizardData {
  name: string;
  description: string;
  objective: string;
  channel: 'Email' | 'SMS' | 'WhatsApp';
  audienceType: string;
  audienceValue: string;
  subject: string;
  message: string;
  selectedCustomerIds: string[];
}

interface CampaignWizardProps {
  customers: Customer[];
  activeDatasetId: string | null;
  activeDatasetName: string;
  onClose: () => void;
  onCreated: (c: CampaignType) => void;
}

function CampaignWizard({ customers, activeDatasetId, activeDatasetName, onClose, onCreated }: CampaignWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    name: '',
    description: '',
    objective: 'Engagement',
    channel: 'Email',
    audienceType: 'All Customers',
    audienceValue: '',
    subject: '',
    message: 'Hi {{first_name}}, we have a special offer for you!',
    selectedCustomerIds: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    configured: boolean;
    message: string;
    errors?: string[];
    provider_message_ids?: string[];
  } | null>(null);

  // Fetch loyalty tier map for active dataset customers
  const [tierMap, setTierMap] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data: loyalty } = await supabase.from('loyalty_accounts').select('customer_id, tier_name');
      const map: Record<string, string> = {};
      (loyalty ?? []).forEach((l) => { map[l.customer_id] = l.tier_name; });
      setTierMap(map);
    })();
  }, []);

  // Filter audience by selected audience criteria within the active dataset
  const audienceCustomers = useMemo(() => {
    let filtered = [...customers];
    if (data.audienceType === 'RFM Segment') {
      filtered = filtered.filter((c) => c.segment === data.audienceValue);
    } else if (data.audienceType === 'Churn Risk') {
      filtered = filtered.filter((c) => c.churn_risk === data.audienceValue);
    } else if (data.audienceType === 'Loyalty Tier') {
      filtered = filtered.filter((c) => tierMap[c.id] === data.audienceValue);
    }
    return filtered;
  }, [customers, data.audienceType, data.audienceValue, tierMap]);

  // Valid recipients for the selected channel
  const validRecipients = useMemo(() => audienceCustomers.filter((c) => hasValidContact(c, data.channel)), [audienceCustomers, data.channel]);
  const invalidRecipients = audienceCustomers.length - validRecipients.length;

  // Breakdown of contact validity across all channels for current dataset audience
  const channelBreakdown = useMemo(() => {
    const counts: Record<string, { valid: number; missing: number; optOut: number }> = {};
    for (const ch of CHANNELS) {
      let valid = 0;
      let missing = 0;
      let optOut = 0;
      for (const c of audienceCustomers) {
        const isOptOut = ch === 'Email' ? c.email_opt_out : ch === 'SMS' ? c.sms_opt_out : c.whatsapp_opt_out;
        if (isOptOut) {
          optOut++;
        } else if (ch === 'Email') {
          if (!c.email || !isValidEmail(c.email)) {
            missing++;
          } else {
            valid++;
          }
        } else {
          if (!c.phone || !normalizePhone(c.phone)) {
            missing++;
          } else {
            valid++;
          }
        }
      }
      counts[ch] = { valid, missing, optOut };
    }
    return counts;
  }, [audienceCustomers]);

  // Synchronize selected recipients when entering recipient selection or when valid recipients change
  useEffect(() => {
    if (step === 4 && data.selectedCustomerIds.length === 0 && validRecipients.length > 0) {
      setData((d) => ({ ...d, selectedCustomerIds: validRecipients.map((c) => c.id) }));
    }
  }, [step, validRecipients]);

  // Filter audience for search in step 4
  const filteredAudience = useMemo(() => {
    if (!searchTerm.trim()) return audienceCustomers;
    const q = searchTerm.toLowerCase().trim();
    return audienceCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.segment && c.segment.toLowerCase().includes(q))
    );
  }, [audienceCustomers, searchTerm]);

  const toggleRecipient = (id: string) => {
    setData((d) => ({
      ...d,
      selectedCustomerIds: d.selectedCustomerIds.includes(id)
        ? d.selectedCustomerIds.filter((r) => r !== id)
        : [...d.selectedCustomerIds, id],
    }));
  };

  const aiGenerate = () => {
    const templates: Record<string, { subject: string; content: string }> = {
      Champions: {
        subject: 'Exclusive VIP Rewards — Just For You',
        content: data.channel === 'SMS'
          ? 'Hi {{first_name}}, as a Champion customer, enjoy 20% off your next order! Use code CHAMP20 at checkout.'
          : 'Dear {{first_name}},\n\nAs one of our most valued Champions, we have curated an exclusive set of VIP rewards tailored specifically for you.\n\nEnjoy premium benefits and a 20% discount on your next purchase using code CHAMP20.\n\nThank you for your loyalty,\nThe BandhanAI Team',
      },
      Loyal: {
        subject: 'Unlock Your Next Loyalty Tier & Bonus Points',
        content: data.channel === 'SMS'
          ? 'Hi {{first_name}}, you are close to Champion tier! Earn double loyalty points on your next purchase today.'
          : 'Dear {{first_name}},\n\nYou are only a few points away from unlocking our top tier! Earn 2x loyalty points on your next order.\n\nBest regards,\nThe BandhanAI Team',
      },
      'At Risk': {
        subject: 'We Miss You — Special Offer Inside',
        content: data.channel === 'SMS'
          ? 'Hi {{first_name}}, we miss you! Here is 15% off your next purchase with code WELCOME15.'
          : 'Hi {{first_name}},\n\nWe noticed you have not visited recently and we truly miss you! Here is an exclusive 15% discount on your next order.\n\nWarm regards,\nThe BandhanAI Team',
      },
      Hibernating: {
        subject: 'Come Back — We Have Something Special For You',
        content: data.channel === 'SMS'
          ? 'Hi {{first_name}}, welcome back with 25% off your next order. Code: RECONNECT25'
          : 'Hi {{first_name}},\n\nWe would love to welcome you back. Enjoy 25% off your next purchase with code RECONNECT25.\n\nWarm regards,\nThe BandhanAI Team',
      },
    };
    const t = templates[data.audienceValue] ?? {
      subject: `Special Offer Just For You`,
      content: data.channel === 'SMS'
        ? `Hi {{first_name}}, check out our latest offers tailored for you today!`
        : `Hi {{first_name}},\n\nWe have an exclusive offer tailored to your preferences. Enjoy special rewards designed to enhance your experience with us.\n\nBest regards,\nThe BandhanAI Team`,
    };
    setData((d) => ({
      ...d,
      subject: data.channel === 'Email' ? t.subject : '',
      message: t.content,
      name: d.name || `${data.audienceValue || data.channel} Campaign`,
    }));
  };

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);

    // Final selected IDs: must be valid contacts
    const effectiveRecipientIds = data.selectedCustomerIds.length > 0
      ? data.selectedCustomerIds.filter((id) => validRecipients.some((vr) => vr.id === id))
      : validRecipients.map((c) => c.id);

    if (effectiveRecipientIds.length === 0) {
      setSendResult({
        sent: 0,
        failed: 0,
        configured: false,
        message: 'No valid recipients selected for this channel. Cannot proceed.',
      });
      setSending(false);
      return;
    }

    // 1. Create campaign record with status 'sending'
    const { data: campaign, error: campError } = await supabase.from('campaigns').insert({
      name: data.name.trim(),
      type: data.channel,
      channel: data.channel,
      target_segment: data.audienceType === 'RFM Segment' ? data.audienceValue : null,
      status: 'sending',
      content: data.message,
      subject_line: data.channel === 'Email' ? data.subject.trim() : null,
      description: data.description.trim() || null,
      objective: data.objective || 'Engagement',
      audience_type: data.audienceType,
      audience_filter: {
        dataset_id: activeDatasetId,
        audience_type: data.audienceType,
        audience_value: data.audienceValue,
      },
      target_audience_count: effectiveRecipientIds.length,
      open_rate: 0,
      click_rate: 0,
      conversion_rate: 0,
      success_rate: 0,
    }).select().single();

    if (campError || !campaign) {
      setSendResult({
        sent: 0,
        failed: effectiveRecipientIds.length,
        configured: false,
        message: `Database error creating campaign: ${campError?.message ?? 'Unknown error'}`,
      });
      setSending(false);
      return;
    }

    // 2. Call Supabase Edge Function to deliver through real provider
    try {
      const { data: result, error: invokeError } = await invokeSendCampaign<{
        sent: number;
        failed: number;
        provider_configured?: boolean;
        message?: string;
        errors?: string[];
        provider_message_ids?: string[];
      }>({
          campaign_id: campaign.id,
          channel: data.channel,
          subject: data.channel === 'Email' ? data.subject.trim() : null,
          message: data.message,
          recipient_ids: effectiveRecipientIds,
          dataset_id: activeDatasetId,
      });

      if (invokeError || !result) {
        const errMessage = invokeError ?? 'Edge Function returned no response.';
        // Mark campaign as failed
        await supabase.from('campaigns').update({ status: 'failed', end_date: new Date().toISOString() }).eq('id', campaign.id);

        setSendResult({
          sent: 0,
          failed: effectiveRecipientIds.length,
          configured: false,
          message: errMessage,
          errors: [errMessage],
        });
        setSending(false);
        onCreated({ ...campaign, status: 'failed' } as CampaignType);
        return;
      }

      setSendResult({
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        configured: result.provider_configured ?? false,
        message: result.message ?? '',
        errors: result.errors ?? [],
        provider_message_ids: result.provider_message_ids ?? [],
      });

      const updatedStatus = (result.sent > 0 && result.failed === 0)
        ? 'sent'
        : (result.sent > 0 && result.failed > 0)
          ? 'partially_failed'
          : 'failed';

      onCreated({ ...campaign, status: updatedStatus } as CampaignType);
    } catch (err) {
      const netErr = `Network error reaching Edge Function: ${String(err)}`;
      await supabase.from('campaigns').update({ status: 'failed', end_date: new Date().toISOString() }).eq('id', campaign.id);
      setSendResult({
        sent: 0,
        failed: effectiveRecipientIds.length,
        configured: false,
        message: netErr,
        errors: [netErr],
      });
      onCreated({ ...campaign, status: 'failed' } as CampaignType);
    }
    setSending(false);
  };

  const steps = ['Details', 'Channel', 'Audience', 'Recipients', 'Message', 'Review'];
  const channelValidCount = channelBreakdown[data.channel]?.valid ?? 0;
  const channelMissingCount = channelBreakdown[data.channel]?.missing ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Create Campaign</h2>
            <p className="text-xs text-slate-400">Dataset: <span className="font-medium text-brand-500">{activeDatasetName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 my-5 overflow-x-auto pb-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i + 1 === step ? 'bg-brand-500 text-white' : i + 1 < step ? 'bg-emerald-500 text-white' : 'bg-slate-500/20 text-slate-400'}`}>
                {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs mr-2 font-medium hidden sm:inline ${i + 1 === step ? 'text-brand-500' : 'text-slate-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-4 h-0.5 mr-2 ${i + 1 < step ? 'bg-emerald-500' : 'bg-slate-500/20'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Campaign Name *</label>
              <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="e.g. VIP Re-engagement Offer" className="input-field" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Objective</label>
              <select value={data.objective} onChange={(e) => setData({ ...data, objective: e.target.value })} className="input-field">
                <option value="Engagement">Customer Engagement</option>
                <option value="Retention">Customer Retention</option>
                <option value="Win-back">Win-back Churned Users</option>
                <option value="Upsell">Upsell & Cross-sell</option>
                <option value="Announcement">Product Announcement</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <input value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Internal notes or goals for this campaign" className="input-field" />
            </div>
            <button onClick={() => setStep(2)} disabled={!data.name.trim()} className="btn-primary w-full disabled:opacity-50">
              Next: Select Channel <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* Step 2: Channel Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Choose the delivery channel. Contact validity is evaluated against customers in <strong>{activeDatasetName}</strong>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['Email', 'SMS'] as const).map((ch) => {
                const Icon = getChannelIcon(ch);
                const info = channelBreakdown[ch] ?? { valid: 0, missing: 0, optOut: 0 };
                const isSelected = data.channel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setData({ ...data, channel: ch, selectedCustomerIds: [] })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-brand-500 bg-brand-500/10 shadow-sm' : 'border-slate-500/20 hover:border-slate-500/40'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-500/10 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{ch}</p>
                        <p className="text-xs text-slate-400">{ch === 'Email' ? 'via Resend' : 'via Twilio SMS'}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valid recipients:</span>
                        <span className="font-semibold text-emerald-500">{info.valid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Missing {ch === 'Email' ? 'email' : 'phone'}:</span>
                        <span className={info.missing > 0 ? 'text-amber-500 font-medium' : 'text-slate-400'}>{info.missing}</span>
                      </div>
                      {info.optOut > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Opted out:</span>
                          <span className="text-slate-400">{info.optOut}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {channelValidCount === 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs text-red-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No customers in "{activeDatasetName}" have valid {data.channel} contact info. You cannot send via {data.channel}.</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
              <button onClick={() => setStep(3)} disabled={channelValidCount === 0} className="btn-primary flex-1 disabled:opacity-50">
                Next: Audience <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Audience */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Select which audience segment from "{activeDatasetName}" to target.</p>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Audience Type</label>
              <select value={data.audienceType} onChange={(e) => setData({ ...data, audienceType: e.target.value, audienceValue: '', selectedCustomerIds: [] })} className="input-field">
                {AUDIENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {data.audienceType === 'RFM Segment' && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>RFM Segment</label>
                <select value={data.audienceValue} onChange={(e) => setData({ ...data, audienceValue: e.target.value, selectedCustomerIds: [] })} className="input-field">
                  <option value="">Select a segment</option>
                  {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {data.audienceType === 'Churn Risk' && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Risk Level</label>
                <select value={data.audienceValue} onChange={(e) => setData({ ...data, audienceValue: e.target.value, selectedCustomerIds: [] })} className="input-field">
                  <option value="">Select risk level</option>
                  {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            {data.audienceType === 'Loyalty Tier' && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Loyalty Tier</label>
                <select value={data.audienceValue} onChange={(e) => setData({ ...data, audienceValue: e.target.value, selectedCustomerIds: [] })} className="input-field">
                  <option value="">Select loyalty tier</option>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {(data.audienceType === 'All Customers' || data.audienceValue) && (
              <div className="p-3 rounded-xl border border-brand-500/20 bg-brand-500/5 space-y-1 text-xs">
                <p className="font-semibold text-brand-500"><Users className="w-4 h-4 inline mr-1" />{audienceCustomers.length} total customers matched</p>
                <p className="text-slate-400">{validRecipients.length} have valid {data.channel} contact info ({invalidRecipients} invalid/missing)</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
              <button onClick={() => setStep(4)} disabled={data.audienceType !== 'All Customers' && !data.audienceValue} className="btn-primary flex-1 disabled:opacity-50">
                Next: Select Recipients <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Recipients Selection */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Select individual recipients. Only customers with valid {data.channel} addresses can receive messages.</p>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customers by name, email, phone, or segment..."
                className="input-field pl-9"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                <strong className="text-brand-500">{data.selectedCustomerIds.length}</strong> of {validRecipients.length} valid selected
                {invalidRecipients > 0 && ` · ${invalidRecipients} invalid`}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setData({ ...data, selectedCustomerIds: validRecipients.map((c) => c.id) })}
                  className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-medium hover:bg-brand-500/20"
                >
                  Select All Valid
                </button>
                <button
                  type="button"
                  onClick={() => setData({ ...data, selectedCustomerIds: [] })}
                  className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Customer list */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {filteredAudience.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No customers found matching "{searchTerm}"</p>
              ) : (
                filteredAudience.map((c) => {
                  const valid = hasValidContact(c, data.channel);
                  const selected = data.selectedCustomerIds.includes(c.id);
                  let invalidReason = '';
                  if (data.channel === 'Email') {
                    if (c.email_opt_out) invalidReason = 'Opted out';
                    else if (!c.email) invalidReason = 'Missing email';
                    else if (!isValidEmail(c.email)) invalidReason = 'Invalid email format';
                  } else {
                    if (c.sms_opt_out) invalidReason = 'Opted out';
                    else if (!c.phone) invalidReason = 'Missing phone';
                    else if (!normalizePhone(c.phone)) invalidReason = 'Invalid phone format';
                  }

                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer border ${
                        selected
                          ? 'border-brand-500/30 bg-brand-500/10'
                          : 'border-slate-500/10 hover:bg-slate-500/5'
                      } ${!valid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!valid}
                        onChange={() => toggleRecipient(c.id)}
                        className="w-4 h-4 accent-brand-500 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                          <Badge className="text-[10px] py-0 px-1.5">{c.segment}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {data.channel === 'Email' ? (c.email || 'No email') : (normalizePhone(c.phone ?? '') || c.phone || 'No phone')}
                        </p>
                      </div>
                      {!valid && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> {invalidReason}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(3)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
              <button
                onClick={() => setStep(5)}
                disabled={data.selectedCustomerIds.length === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Next: Compose Message ({data.selectedCustomerIds.length}) <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Message Composition */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Compose your campaign message. Personalization variables will be populated with recipient database fields.</p>

            {data.channel === 'Email' && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Subject Line *</label>
                <input
                  value={data.subject}
                  onChange={(e) => setData({ ...data, subject: e.target.value })}
                  placeholder="e.g. Exclusive Rewards for {{first_name}}"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Message Content *</label>
                {data.channel === 'SMS' && (
                  <span className="text-[11px] text-slate-400">
                    {data.message.length} chars · {Math.ceil(data.message.length / 160) || 1} SMS segment(s)
                  </span>
                )}
              </div>
              <textarea
                value={data.message}
                onChange={(e) => setData({ ...data, message: e.target.value })}
                rows={data.channel === 'Email' ? 6 : 4}
                className="input-field resize-none font-mono text-sm"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1">Insert variable:</span>
                {['{{first_name}}', '{{last_name}}', '{{name}}', '{{email}}', '{{phone}}', '{{segment}}', '{{loyalty_tier}}', '{{total_spend}}'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setData({ ...data, message: data.message + ' ' + v })}
                    className="text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-300 hover:bg-brand-500/20 hover:text-brand-500 font-mono transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={aiGenerate} type="button" className="btn-secondary w-full flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-500" /> Generate Template with AI
            </button>

            {/* Live Preview */}
            {validRecipients.length > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-500/20 bg-slate-500/5 space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Live Recipient Preview (First Recipient):</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  To: {data.channel === 'Email' ? validRecipients[0].email : normalizePhone(validRecipients[0].phone ?? '')}
                </p>
                {data.channel === 'Email' && data.subject && (
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Subject: {personalizeMessage(data.subject, { ...validRecipients[0], tier_name: tierMap[validRecipients[0].id] })}
                  </p>
                )}
                <div className="text-xs pt-1 mt-1 border-t border-slate-500/10 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {personalizeMessage(data.message, { ...validRecipients[0], tier_name: tierMap[validRecipients[0].id] })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
              <button
                onClick={() => setStep(6)}
                disabled={(data.channel === 'Email' && !data.subject.trim()) || !data.message.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Review & Confirm <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Send */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Review & Confirm Delivery</h3>
            <div className="space-y-2 text-sm p-3.5 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
              <ReviewRow label="Campaign Name" value={data.name} />
              <ReviewRow label="Delivery Channel" value={`${data.channel} (${data.channel === 'Email' ? 'Resend' : 'Twilio'})`} />
              <ReviewRow label="Active Dataset" value={activeDatasetName} />
              <ReviewRow label="Target Audience" value={data.audienceType + (data.audienceValue ? `: ${data.audienceValue}` : '')} />
              <ReviewRow label="Selected Recipients" value={String(data.selectedCustomerIds.length || validRecipients.length)} />
              {data.channel === 'Email' && <ReviewRow label="Subject Line" value={data.subject} />}
            </div>

            {/* Recipient preview list */}
            {(() => {
              const selectedRecipients = data.selectedCustomerIds.length > 0
                ? validRecipients.filter((c) => data.selectedCustomerIds.includes(c.id))
                : validRecipients;
              const previewList = selectedRecipients.slice(0, 8);
              return (
                <div className="p-3 rounded-xl max-h-36 overflow-y-auto border border-slate-500/15" style={{ background: 'rgba(148,163,184,0.03)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Destination Addresses ({selectedRecipients.length} customer{selectedRecipients.length !== 1 ? 's' : ''}):
                  </p>
                  <div className="space-y-1">
                    {previewList.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                        <span className="text-slate-400 font-mono text-[11px] ml-2 truncate">
                          {data.channel === 'Email' ? c.email : normalizePhone(c.phone ?? '') ?? c.phone}
                        </span>
                      </div>
                    ))}
                    {selectedRecipients.length > 8 && (
                      <p className="text-[11px] text-slate-400 pt-1">...and {selectedRecipients.length - 8} more recipients</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {sendResult && (
              <div className={`p-4 rounded-xl text-sm ${sendResult.sent > 0 && sendResult.failed === 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : sendResult.sent > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                {sendResult.sent > 0 && sendResult.failed === 0 ? (
                  <div className="space-y-1 text-emerald-500">
                    <p className="font-semibold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> All {sendResult.sent} {data.channel === 'Email' ? 'emails' : 'SMS messages'} sent successfully!</p>
                    <p className="text-xs opacity-90">{sendResult.message}</p>
                    {sendResult.provider_message_ids && sendResult.provider_message_ids.length > 0 && (
                      <p className="text-[11px] font-mono opacity-80 pt-1">Provider ID sample: {sendResult.provider_message_ids[0]}</p>
                    )}
                  </div>
                ) : sendResult.sent > 0 ? (
                  <div className="space-y-1 text-amber-500">
                    <p className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Partial Delivery: {sendResult.sent} sent, {sendResult.failed} failed.</p>
                    <p className="text-xs">{sendResult.message}</p>
                    {sendResult.errors && sendResult.errors.length > 0 && (
                      <div className="mt-2 text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20 font-mono break-words">
                        {sendResult.errors[0]}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-red-500">
                    <p className="font-semibold flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Message Delivery Failed</p>
                    <p className="text-xs opacity-90">{sendResult.message}</p>
                    {sendResult.errors && sendResult.errors.length > 0 && (
                      <div className="mt-2 text-xs bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 font-mono break-words text-red-400">
                        {sendResult.errors[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {sending ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Dispatching messages via {data.channel === 'Email' ? 'Resend API' : 'Twilio API'}...
                </span>
                <span className="text-xs text-slate-400">Please wait while provider confirms delivery status.</span>
              </div>
            ) : sendResult ? (
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-500">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                    You are sending to <strong>{data.selectedCustomerIds.length || validRecipients.length}</strong> recipients via {data.channel}. Messages are submitted directly to the configured provider API.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(5)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
                  <button onClick={handleSend} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Send Campaign Now
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

// ============ CAMPAIGN DETAIL MODAL ============

function CampaignDetailModal({ campaign, recipients, onClose }: { campaign: CampaignType; recipients: ReturnType<typeof useCampaignRecipients>['data']; onClose: () => void }) {
  const sent = recipients.filter((r) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
  const failed = recipients.filter((r) => r.status === 'failed').length;
  const delivered = recipients.filter((r) => r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
  const opened = recipients.filter((r) => r.status === 'opened' || r.status === 'clicked').length;
  const clicked = recipients.filter((r) => r.status === 'clicked').length;

  const statusIcon = (status: string) => {
    if (status === 'sent' || status === 'delivered' || status === 'opened' || status === 'clicked') return <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  };

  const Icon = getChannelIcon(campaign.channel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-2xl p-6 max-h-[88vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{campaign.name}</h2>
                <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
              </div>
              <p className="text-xs text-slate-400">
                {campaign.channel} · {campaign.target_segment ?? campaign.audience_type ?? 'All'} · Created {formatDateTime(campaign.created_at)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        {campaign.subject_line && (
          <div className="mb-3 p-3 rounded-xl bg-slate-500/5 border border-slate-500/10 text-xs">
            <span className="text-slate-400 font-medium mr-1.5">Subject:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{campaign.subject_line}</span>
          </div>
        )}

        {campaign.content && (
          <div className="mb-4 p-3 rounded-xl bg-slate-500/5 border border-slate-500/10 text-xs">
            <p className="text-slate-400 font-medium mb-1">Message Content:</p>
            <p className="whitespace-pre-line font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{campaign.content}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <DetailStat label="Total Target" value={String(recipients.length || campaign.target_audience_count)} color="#3b82f6" />
          <DetailStat label="Submitted/Sent" value={String(sent)} color="#06b6d4" />
          <DetailStat label="Delivered" value={String(delivered)} color="#10b981" />
          <DetailStat label="Failed" value={String(failed)} color="#ef4444" />
        </div>

        {campaign.channel === 'Email' && (opened > 0 || clicked > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <DetailStat label="Opened" value={String(opened)} color="#8b5cf6" />
            <DetailStat label="Clicked" value={String(clicked)} color="#ec4899" />
          </div>
        )}

        <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Recipient Delivery Tracking</h3>
        {recipients.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No individual recipient logs found for this campaign.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recipients.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border border-slate-500/10" style={{ background: 'rgba(148,163,184,0.03)' }}>
                <div className="flex items-center gap-3">
                  {statusIcon(r.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.customer?.name ?? 'Customer'}</p>
                      {r.customer?.segment && <Badge className="text-[10px] py-0 px-1">{r.customer.segment}</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{r.recipient}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                    {r.sent_at && <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(r.sent_at)}</p>}
                  </div>
                </div>

                {r.provider_message_id && (
                  <p className="text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-500/10">
                    Provider ID: <code className="bg-slate-500/10 px-1 py-0.5 rounded text-emerald-400">{r.provider_message_id}</code>
                  </p>
                )}

                {r.error_message && (
                  <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono break-words whitespace-pre-wrap">
                    {r.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DetailStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: `${color}15` }}>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

// ============ TEST EMAIL MODAL ============

interface TestResult {
  success?: boolean;
  message?: string;
  error?: string;
  provider_message_id?: string;
  sender?: string;
  recipient?: string;
  resend_status?: number;
  twilio_status?: number;
  twilio_code?: number;
  twilio_more_info?: string;
  diagnostics?: {
    api_key_configured?: boolean;
    sender_configured?: boolean;
    sender_address?: string;
    reached_resend?: boolean;
    resend_status?: number | null;
    resend_response?: string | null;
    sid_configured?: boolean;
    token_configured?: boolean;
    phone_configured?: boolean;
    phone_number?: string | null;
    reached_twilio?: boolean;
    twilio_status?: number | null;
    twilio_response?: string | null;
    message?: string;
  };
}

function TestEmailModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'connection' | 'send'>('connection');
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('BandhanAI Test Email');
  const [testMessage, setTestMessage] = useState('This is a test email from BandhanAI CRM. If you received this, email delivery is working correctly.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runConnectionCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeSendCampaign<TestResult>({ action: 'test_connection' });
      setResult(error ? { error } : data ?? { error: 'Edge Function returned no response.' });
    } catch (err) {
      setResult({ error: await getFunctionErrorMessage(err) });
    }
    setLoading(false);
  };

  const runTestSend = async () => {
    if (!testEmail.trim() || !isValidEmail(testEmail)) {
      setResult({ error: 'Please enter a valid recipient email address' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeSendCampaign<TestResult>({
        action: 'test_send',
        to_email: testEmail.trim(),
        subject: testSubject.trim(),
        message: testMessage,
      });
      setResult(error ? { error } : data ?? { error: 'Edge Function returned no response.' });
    } catch (err) {
      setResult({ error: await getFunctionErrorMessage(err) });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TestTube className="w-5 h-5 text-brand-500" /> Email Delivery Test (Resend)
          </h2>
          <button onClick={() => !loading && onClose()} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: 'rgba(148,163,184,0.08)' }}>
          <button onClick={() => { setTab('connection'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === 'connection' ? 'bg-brand-500 text-white' : 'text-slate-400'}`}>
            <Zap className="w-4 h-4 inline mr-1" /> Check Configuration
          </button>
          <button onClick={() => { setTab('send'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === 'send' ? 'bg-brand-500 text-white' : 'text-slate-400'}`}>
            <Send className="w-4 h-4 inline mr-1" /> Send Test Email
          </button>
        </div>

        {tab === 'connection' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Verifies whether RESEND_API_KEY and RESEND_FROM_EMAIL are configured in Supabase Edge Function secrets.</p>
            <button onClick={runConnectionCheck} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Checking...' : 'Run Configuration Check'}
            </button>
            {result?.diagnostics && (
              <div className="space-y-2 mt-3">
                <DiagRow label="RESEND_API_KEY Configured" ok={result.diagnostics.api_key_configured ?? false} />
                <DiagRow label="RESEND_FROM_EMAIL Configured" ok={result.diagnostics.sender_configured ?? false} detail={result.diagnostics.sender_address} />
                <DiagRow label="Reached Resend API" ok={result.diagnostics.reached_resend ?? false} />
                <DiagRow label="Resend API Response" ok={result.diagnostics.resend_status === 200} detail={result.diagnostics.resend_response ?? `HTTP ${result.diagnostics.resend_status}`} />
                <div className={`p-3 rounded-xl text-xs ${result.diagnostics.api_key_configured && result.diagnostics.reached_resend ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {result.diagnostics.message}
                </div>
              </div>
            )}
            {result?.error && (
              <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {result.error}
              </div>
            )}
          </div>
        )}

        {tab === 'send' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Send a single test email directly via the Resend API to verify real mailbox delivery.</p>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Test Email Address *</label>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Subject</label>
              <input value={testSubject} onChange={(e) => setTestSubject(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Message</label>
              <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={4} className="input-field resize-none text-sm" />
            </div>
            <button onClick={runTestSend} disabled={loading || !testEmail.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Send Test Email'}
            </button>
            {result && (
              <div className={`p-3 rounded-xl text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {result.success ? (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium"><CheckCircle className="w-4 h-4" /> {result.message}</p>
                    {result.provider_message_id && <p className="text-xs font-mono">Resend Message ID: {result.provider_message_id}</p>}
                    <p className="text-xs">From: {result.sender} → To: {result.recipient}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium"><XCircle className="w-4 h-4" /> {result.error ?? result.message}</p>
                    {result.sender && <p className="text-xs">Sender address: {result.sender}</p>}
                    {result.resend_status && <p className="text-xs">Resend HTTP Status: {result.resend_status}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============ TEST SMS MODAL ============

function TestSmsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'connection' | 'send'>('connection');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test SMS from BandhanAI CRM. If you received this, SMS delivery is working correctly.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runConnectionCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeSendCampaign<TestResult>({ action: 'test_sms_connection' });
      setResult(error ? { error } : data ?? { error: 'Edge Function returned no response.' });
    } catch (err) {
      setResult({ error: await getFunctionErrorMessage(err) });
    }
    setLoading(false);
  };

  const runTestSend = async () => {
    if (!testPhone.trim()) {
      setResult({ error: 'Please enter a valid phone number' });
      return;
    }
    const normalized = normalizePhone(testPhone);
    if (!normalized) {
      setResult({ error: `Invalid phone number format: "${testPhone}". Twilio requires E.164 format (e.g. +14155552671).` });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await invokeSendCampaign<TestResult>({
        action: 'test_sms_send',
        to_phone: normalized,
        message: testMessage,
      });
      setResult(error ? { error } : data ?? { error: 'Edge Function returned no response.' });
    } catch (err) {
      setResult({ error: await getFunctionErrorMessage(err) });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Smartphone className="w-5 h-5 text-brand-500" /> SMS Delivery Test (Twilio)
          </h2>
          <button onClick={() => !loading && onClose()} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: 'rgba(148,163,184,0.08)' }}>
          <button onClick={() => { setTab('connection'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === 'connection' ? 'bg-brand-500 text-white' : 'text-slate-400'}`}>
            <Zap className="w-4 h-4 inline mr-1" /> Check Configuration
          </button>
          <button onClick={() => { setTab('send'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === 'send' ? 'bg-brand-500 text-white' : 'text-slate-400'}`}>
            <Send className="w-4 h-4 inline mr-1" /> Send Test SMS
          </button>
        </div>

        {tab === 'connection' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Verifies TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER against the Twilio REST API.</p>
            <button onClick={runConnectionCheck} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Checking...' : 'Run Configuration Check'}
            </button>
            {result?.diagnostics && (
              <div className="space-y-2 mt-3">
                <DiagRow label="Account SID Configured" ok={result.diagnostics.sid_configured ?? false} />
                <DiagRow label="Auth Token Configured" ok={result.diagnostics.token_configured ?? false} />
                <DiagRow label="Twilio Sender Phone Configured" ok={result.diagnostics.phone_configured ?? false} detail={result.diagnostics.phone_number ?? undefined} />
                <DiagRow label="Reached Twilio API" ok={result.diagnostics.reached_twilio ?? false} />
                <DiagRow label="Twilio Account Verified" ok={result.diagnostics.twilio_status === 200} detail={result.diagnostics.twilio_response ?? `HTTP ${result.diagnostics.twilio_status}`} />
                <div className={`p-3 rounded-xl text-xs ${result.diagnostics.sid_configured && result.diagnostics.reached_twilio && result.diagnostics.twilio_status === 200 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {result.diagnostics.message}
                </div>
              </div>
            )}
            {result?.error && (
              <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {result.error}
              </div>
            )}
          </div>
        )}

        {tab === 'send' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Send a single test SMS directly through Twilio to a phone number you control.</p>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Test Phone Number (E.164) *</label>
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+1234567890" className="input-field" />
              <p className="text-[11px] text-slate-400 mt-1">Must include country code, e.g. +1 for US/Canada, +44 for UK, +91 for India.</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Message</label>
              <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={3} className="input-field resize-none text-sm" />
            </div>
            <button onClick={runTestSend} disabled={loading || !testPhone.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Send Test SMS'}
            </button>
            {result && (
              <div className={`p-3.5 rounded-xl text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {result.success ? (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium"><CheckCircle className="w-4 h-4" /> {result.message}</p>
                    {result.provider_message_id && <p className="text-xs font-mono">Twilio Message SID: {result.provider_message_id}</p>}
                    <p className="text-xs">From: {result.sender} → To: {result.recipient}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="flex items-start gap-2 font-medium"><XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {result.error ?? result.message}</p>
                    {result.sender && <p className="text-xs">Twilio Sender: {result.sender}</p>}
                    {result.twilio_code && (
                      <p className="text-xs font-mono">
                        Twilio Error Code: {result.twilio_code}
                        {result.twilio_more_info && (
                          <a href={result.twilio_more_info} target="_blank" rel="noreferrer" className="underline ml-2 text-brand-400">
                            View Docs
                          </a>
                        )}
                      </p>
                    )}
                    {(result.twilio_code === 572006 || String(result.twilio_code) === '572006') && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 mt-2">
                        <strong>Trial Account Limitation (Twilio 572006):</strong> Freeform SMS messages are rejected by Twilio on trial accounts unless the recipient phone number is verified in the Twilio Console under <em>Phone Numbers → Verified Caller IDs</em>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DiagRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      {detail && <span className="text-xs text-slate-400 truncate max-w-48 font-mono">{detail}</span>}
    </div>
  );
}
