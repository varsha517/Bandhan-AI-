import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, DollarSign, Award, Mail, TrendingUp,
  AlertTriangle, UploadCloud, ShoppingCart, Percent,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { PageHeader, StatCard, Card, EmptyState } from '@/components/ui';
import { useCustomers, useCampaigns, useLoyaltyAccounts, useTransactions, useChurnPredictions } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#10b981',
  'Loyal Customers': '#3b82f6',
  'Potential Loyalists': '#06b6d4',
  'New Customers': '#8b5cf6',
  Promising: '#ec4899',
  'Need Attention': '#f59e0b',
  'At Risk': '#f97316',
  "Can't Lose Them": '#dc2626',
  Hibernating: '#64748b',
  Lost: '#ef4444',
  Platinum: '#8b5cf6',
  Gold: '#f59e0b',
  Silver: '#94a3b8',
  Bronze: '#b45309',
  Regular: '#06b6d4',
};

const CHURN_COLORS: Record<string, string> = {
  Critical: '#dc2626',
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

export default function Dashboard() {
  const { activeDatasetId, activeDataset } = useDataset();
  const { data: customers, loading } = useCustomers(activeDatasetId);
  const { data: campaigns } = useCampaigns(activeDatasetId);
  const { data: loyalty } = useLoyaltyAccounts(activeDatasetId);
  const { data: transactions } = useTransactions(activeDatasetId);
  const { data: churnList } = useChurnPredictions(activeDatasetId);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'Active').length;
    const atRisk = customers.filter((c) => c.status === 'At Risk' || c.churn_risk === 'High' || c.churn_risk === 'Critical').length;
    const lost = customers.filter((c) => c.status === 'Lost').length;

    const revenueFromCust = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    const revenueFromTxn = transactions.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const revenue = revenueFromTxn > 0 ? revenueFromTxn : revenueFromCust;

    const totalOrders = transactions.length > 0
      ? transactions.length
      : customers.reduce((sum, c) => sum + Number(c.total_orders || 0), 0);

    const avgCustomerValue = total > 0 ? Math.round(revenue / total) : 0;
    const highRiskCount = customers.filter((c) => c.churn_risk === 'High' || c.churn_risk === 'Critical').length;
    const churnRiskRate = total > 0 ? (highRiskCount / total) : 0;

    const loyaltyMembers = loyalty.length;
    const avgCampaignSuccess = campaigns.length
      ? campaigns.reduce((s, c) => s + Number(c.success_rate || 0), 0) / campaigns.length
      : 0;

    return {
      total,
      active,
      atRisk,
      lost,
      revenue,
      totalOrders,
      avgCustomerValue,
      churnRiskRate,
      loyaltyMembers,
      avgCampaignSuccess,
    };
  }, [customers, campaigns, loyalty, transactions]);

  // Segment distribution
  const segmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      counts[c.segment] = (counts[c.segment] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [customers]);

  // Churn risk distribution
  const churnData = useMemo(() => {
    const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    if (churnList.length > 0) {
      churnList.forEach((ch) => {
        const level = ch.risk_level || 'Low';
        counts[level] = (counts[level] ?? 0) + 1;
      });
    } else {
      customers.forEach((c) => {
        const level = c.churn_risk || 'Low';
        counts[level] = (counts[level] ?? 0) + 1;
      });
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, color: CHURN_COLORS[name] || '#3b82f6' }));
  }, [churnList, customers]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; revenue: number; orders: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      let monthRev = 0;
      let monthOrders = 0;

      if (transactions.length > 0) {
        const monthTxns = transactions.filter((t) => {
          const td = new Date(t.transaction_date);
          return td >= monthStart && td <= monthEnd && t.status === 'Completed';
        });
        monthRev = monthTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
        monthOrders = monthTxns.length;
      } else {
        // Fallback from customer last purchase date
        const monthCusts = customers.filter((c) => {
          if (!c.last_purchase_date) return false;
          const pd = new Date(c.last_purchase_date);
          return pd >= monthStart && pd <= monthEnd;
        });
        monthRev = monthCusts.reduce((s, c) => s + Number(c.total_spent || 0), 0);
        monthOrders = monthCusts.reduce((s, c) => s + Number(c.total_orders || 1), 0);
      }

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(monthRev),
        orders: monthOrders,
      });
    }
    return months;
  }, [transactions, customers]);

  // Customer growth
  const customerGrowth = useMemo(() => {
    const now = new Date();
    const months: { month: string; customers: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = customers.filter((c) => {
        const cd = new Date(c.created_at || c.last_purchase_date || Date.now());
        return cd >= monthStart && cd <= monthEnd;
      }).length;
      months.push({ month: d.toLocaleDateString('en-US', { month: 'short' }), customers: count });
    }
    return months;
  }, [customers]);

  // Campaign performance
  const campaignData = useMemo(() => {
    return campaigns.slice(0, 5).map((c) => ({
      name: c.name.length > 12 ? c.name.substring(0, 12) + '...' : c.name,
      open: Math.round(Number(c.open_rate || 0) * 100),
      click: Math.round(Number(c.click_rate || 0) * 100),
      success: Math.round(Number(c.success_rate || 0) * 100),
    }));
  }, [campaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={
            activeDataset
              ? `Active Dataset: ${activeDataset.filename} (No customer records found)`
              : 'Overview of SME customer analytics and performance'
          }
        />
        <EmptyState
          icon={UploadCloud}
          title="No customer data available"
          subtitle="To view real analytics, RFM segmentation, churn probabilities, and send campaigns, please import a dataset."
          action={
            <button onClick={() => navigate('/datasets')} className="btn-primary">
              <UploadCloud className="w-4 h-4" /> Go to Dataset Upload
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          activeDataset
            ? `Active Dataset: ${activeDataset.filename} · ${stats.total} customers loaded`
            : 'Overview of business performance'
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Customers"
          value={formatNumber(stats.total)}
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          color="#06b6d4"
        />
        <StatCard
          label="Total Orders"
          value={formatNumber(stats.totalOrders)}
          icon={ShoppingCart}
          color="#10b981"
        />
        <StatCard
          label="Avg Customer Value"
          value={formatCurrency(stats.avgCustomerValue)}
          icon={Award}
          color="#8b5cf6"
        />
        <StatCard
          label="Active Customers"
          value={formatNumber(stats.active)}
          icon={UserCheck}
          color="#10b981"
        />
        <StatCard
          label="At-Risk Customers"
          value={formatNumber(stats.atRisk)}
          icon={AlertTriangle}
          color="#f59e0b"
        />
        <StatCard
          label="Churn Risk Rate"
          value={formatPercent(stats.churnRiskRate)}
          icon={Percent}
          color="#ef4444"
        />
        <StatCard
          label="Campaign Success"
          value={campaigns.length > 0 ? formatPercent(stats.avgCampaignSuccess) : 'N/A'}
          icon={TrendingUp}
          color="#ec4899"
        />
      </div>

      {/* Charts Row 1: Revenue Trend & Customer Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue Trend</h3>
            <span className="text-xs text-slate-400">Monthly completed revenue</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                formatter={(v) => [formatCurrency(Number(v)), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>RFM Segment Distribution</h3>
            <span className="text-xs text-slate-400">Customer segment breakdown</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {segmentData.map((entry) => (
                  <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name] ?? '#3b82f6'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2: Churn Distribution & Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Churn Risk Distribution</h3>
            <span className="text-xs text-slate-400">Low, Medium, High & Critical Risk</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={churnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
              />
              <Bar dataKey="value" name="Customers" radius={[4, 4, 0, 0]}>
                {churnData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Campaign Performance</h3>
            <span className="text-xs text-slate-400">Open, click & success rates</span>
          </div>
          {campaignData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 text-sm">
              <Mail className="w-8 h-8 mb-2 opacity-40" />
              <p>No campaigns executed yet for this dataset</p>
              <button onClick={() => navigate('/campaigns')} className="text-xs text-brand-500 hover:underline mt-2">
                Launch a Campaign →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="open" name="Open %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="click" name="Click %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="success" name="Success %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
