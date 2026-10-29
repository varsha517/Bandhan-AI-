import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Building, MapPin,
  Calendar, MessageSquare, Smile,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Badge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, getInitials, getStatusColor, getRiskColor, getSentimentColor, getTierColor } from '@/lib/utils';
import type { Customer, Transaction, Sentiment, LoyaltyAccount, ChurnPrediction, CampaignRecipient } from '@/lib/types';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sentiments, setSentiments] = useState<Sentiment[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [churn, setChurn] = useState<ChurnPrediction | null>(null);
  const [communications, setCommunications] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: t }, { data: s }, { data: l }, { data: ch }, { data: comm }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).maybeSingle(),
        supabase.from('transactions').select('*').eq('customer_id', id).order('transaction_date', { ascending: false }),
        supabase.from('sentiments').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('loyalty_accounts').select('*').eq('customer_id', id).maybeSingle(),
        supabase.from('churn_predictions').select('*').eq('customer_id', id).maybeSingle(),
        supabase.from('campaign_recipients').select('*, campaign:campaigns(name)').eq('customer_id', id).order('created_at', { ascending: false }),
      ]);
      setCustomer(c as Customer);
      setTransactions((t as Transaction[]) ?? []);
      setSentiments((s as Sentiment[]) ?? []);
      setLoyalty(l as LoyaltyAccount);
      setChurn(ch as ChurnPrediction);
      setCommunications((comm as CampaignRecipient[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <div className="text-center py-16 text-slate-400">Customer not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-500 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Profile header */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: customer.avatar_color }}
          >
            {getInitials(customer.name)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={getStatusColor(customer.status)}>{customer.status}</Badge>
              <Badge className={getRiskColor(customer.churn_risk)}>Churn: {customer.churn_risk}</Badge>
              <Badge className={getSentimentColor(customer.sentiment_label)}>{customer.sentiment_label}</Badge>
              {loyalty && <Badge className={getTierColor(loyalty.tier_name)}>{loyalty.tier_name} Member</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(customer.total_spent))}</p>
            <p className="text-xs text-slate-400">Total Spent</p>
          </div>
        </div>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Contact info */}
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Contact Information</h3>
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={customer.email} />
            <InfoRow icon={Phone} label="Phone" value={customer.phone} />
            <InfoRow icon={Building} label="Company" value={customer.company} />
            <InfoRow icon={MapPin} label="Location" value={customer.location} />
            <InfoRow icon={Calendar} label="Last Purchase" value={formatDate(customer.last_purchase_date)} />
          </div>
        </Card>

        {/* Loyalty */}
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Loyalty & Points</h3>
          {loyalty ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Tier</span>
                <Badge className={getTierColor(loyalty.tier_name)}>{loyalty.tier_name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Points</span>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{loyalty.points.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Lifetime Points</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{loyalty.lifetime_points.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Points Redeemed</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{loyalty.points_redeemed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Member Since</span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(loyalty.joined_date)}</span>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">No loyalty account</p>}
        </Card>

        {/* Churn prediction */}
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Churn Prediction</h3>
          {churn ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Probability</span>
                <span className="text-lg font-bold text-red-500">{(Number(churn.churn_probability) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Risk Level</span>
                <Badge className={getRiskColor(churn.risk_level)}>{churn.risk_level}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Confidence</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{(Number(churn.confidence_score) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Reasons</p>
                <ul className="space-y-1">
                  {churn.reasons.map((r, i) => (
                    <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-1 h-1 rounded-full bg-slate-400" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs text-slate-400 mb-1">Suggested Strategy</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{churn.suggested_strategy}</p>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">No churn risk detected</p>}
        </Card>
      </div>

      {/* Purchase history */}
      <Card className="mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Purchase History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 px-4 font-medium">Category</th>
                  <th className="pb-2 px-4 font-medium">Date</th>
                  <th className="pb-2 px-4 font-medium">Status</th>
                  <th className="pb-2 pl-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>{t.product_name}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-400">{t.category}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-400">{formatDate(t.transaction_date)}</td>
                    <td className="py-2.5 px-4"><Badge className={getStatusColor(t.status)}>{t.status}</Badge></td>
                    <td className="py-2.5 pl-4 text-sm font-medium text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(t.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sentiment history */}
      <Card>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Sentiment History</h3>
        {sentiments.length === 0 ? (
          <p className="text-sm text-slate-400">No sentiment data</p>
        ) : (
          <div className="space-y-3">
            {sentiments.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
                <Smile className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge className={getSentimentColor(s.sentiment_label)}>{s.sentiment_label}</Badge>
                    <span className="text-xs text-slate-400">Score: {Number(s.sentiment_score).toFixed(1)}</span>
                    {s.rating && <span className="text-xs text-slate-400">Rating: {s.rating}/5</span>}
                    <span className="text-xs text-slate-400">{formatDate(s.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Communication History */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Communication History</h3>
        </div>
        {communications.length === 0 ? (
          <p className="text-sm text-slate-400">No campaign communications yet</p>
        ) : (
          <div className="space-y-3">
            {communications.map((comm) => {
              const Icon = comm.channel === 'Email' ? Mail : comm.channel === 'SMS' ? Phone : MessageSquare;
              const campaignName = (comm as never as { campaign?: { name?: string } }).campaign?.name ?? 'Campaign';
              return (
                <div key={comm.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{campaignName}</p>
                      <Badge className={comm.status === 'failed' ? 'text-red-500 bg-red-500/10 border-red-500/20' : comm.status === 'sent' || comm.status === 'delivered' || comm.status === 'opened' || comm.status === 'clicked' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}>{comm.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">{comm.channel}</span>
                      <span className="text-xs text-slate-400">{formatDate(comm.created_at)}</span>
                      {comm.recipient && <span className="text-xs text-slate-400">To: {comm.recipient}</span>}
                    </div>
                    {comm.error_message && <p className="text-xs text-red-400 mt-1">{comm.error_message}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}
