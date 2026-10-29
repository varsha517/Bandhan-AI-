import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { GitBranch, Users, DollarSign, Repeat, ArrowRight, UploadCloud, Eye } from 'lucide-react';
import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/ui';
import { useSegments, useCustomers } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatCurrency, getInitials } from '@/lib/utils';

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
  Loyal: '#3b82f6',
  'Potential Loyalist': '#06b6d4',
  Premium: '#8b5cf6',
  New: '#8b5cf6',
};

export default function Segmentation() {
  const { activeDatasetId, activeDataset } = useDataset();
  const { data: segments, loading } = useSegments(activeDatasetId);
  const { data: customers } = useCustomers(activeDatasetId);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const navigate = useNavigate();

  const segmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const revenue: Record<string, number> = {};
    const recencySum: Record<string, number> = {};
    const freqSum: Record<string, number> = {};

    segments.forEach((s) => {
      const name = s.segment_name;
      counts[name] = (counts[name] ?? 0) + 1;
      revenue[name] = (revenue[name] ?? 0) + Number(s.monetary || 0);
      recencySum[name] = (recencySum[name] ?? 0) + Number(s.recency_days || 0);
      freqSum[name] = (freqSum[name] ?? 0) + Number(s.frequency || 0);
    });

    return Object.keys(counts).map((name) => ({
      name,
      count: counts[name],
      revenue: revenue[name],
      avgRecency: Math.round(recencySum[name] / counts[name]),
      avgFreq: (freqSum[name] / counts[name]).toFixed(1),
    }));
  }, [segments]);

  const pieData = segmentStats.map((s) => ({ name: s.name, value: s.count }));

  const scatterData = useMemo(() => {
    return segments.map((s) => ({
      x: s.recency_days,
      y: Number(s.frequency),
      z: Number(s.monetary) / 100,
      segment: s.segment_name,
    }));
  }, [segments]);

  const radarData = useMemo(() => {
    const avgBySegment: Record<string, { r: number; f: number; m: number; count: number }> = {};
    segments.forEach((s) => {
      const name = s.segment_name;
      if (!avgBySegment[name]) {
        avgBySegment[name] = { r: 0, f: 0, m: 0, count: 0 };
      }
      avgBySegment[name].r += s.recency_days;
      avgBySegment[name].f += s.frequency;
      avgBySegment[name].m += Number(s.monetary || 0);
      avgBySegment[name].count++;
    });

    return Object.entries(avgBySegment).map(([name, v]) => ({
      segment: name.length > 12 ? name.substring(0, 12) + '...' : name,
      Recency: Math.round(v.r / v.count),
      Frequency: Math.round(v.f / v.count),
      Monetary: Math.round(v.m / v.count / 1000),
    }));
  }, [segments]);

  const totalRevenue = segmentStats.reduce((s, x) => s + x.revenue, 0);
  const avgFrequency = segments.length ? segments.reduce((s, x) => s + x.frequency, 0) / segments.length : 0;

  // Filter customers for the selected segment
  const selectedCustomers = useMemo(() => {
    if (!selectedSegment) return [];
    return customers.filter((c) => c.segment === selectedSegment);
  }, [customers, selectedSegment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div>
        <PageHeader
          title="Customer RFM Segmentation"
          subtitle="Recency, Frequency, and Monetary value behavioral segmentation"
        />
        <EmptyState
          icon={UploadCloud}
          title="No segmentation data in active dataset"
          subtitle="Upload a dataset with purchase dates and amounts to generate real RFM customer segments."
          action={
            <button onClick={() => navigate('/datasets')} className="btn-primary">
              <UploadCloud className="w-4 h-4" /> Go to Datasets
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Customer RFM Segmentation"
        subtitle={
          activeDataset
            ? `Active Dataset: ${activeDataset.filename} · ${segmentStats.length} active customer segments`
            : 'RFM analysis and customer behavioral clustering'
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Segments" value={segmentStats.length} icon={GitBranch} color="#3b82f6" />
        <StatCard label="Segmented Customers" value={segments.length} icon={Users} color="#10b981" />
        <StatCard label="Avg Frequency" value={avgFrequency.toFixed(1)} icon={Repeat} color="#06b6d4" />
        <StatCard label="Total Segment Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Segment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                onClick={(entry) => setSelectedSegment(entry.name ?? null)}
                className="cursor-pointer"
              >
                {pieData.map((e) => (
                  <Cell
                    key={e.name}
                    fill={SEGMENT_COLORS[e.name] ?? '#3b82f6'}
                    stroke={selectedSegment === e.name ? '#ffffff' : 'transparent'}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>RFM Scatter (Recency vs Frequency)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" dataKey="x" name="Recency" unit="d" stroke="#94a3b8" fontSize={12} />
              <YAxis type="number" dataKey="y" name="Frequency" stroke="#94a3b8" fontSize={12} />
              <ZAxis type="number" dataKey="z" range={[30, 220]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
              />
              {Object.entries(SEGMENT_COLORS).map(([name, color]) => {
                const data = scatterData.filter((d) => d.segment === name);
                if (data.length === 0) return null;
                return <Scatter key={name} name={name} data={data} fill={color} />;
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>RFM Radar Profile (Average by Segment)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(148,163,184,0.2)" />
            <PolarAngleAxis dataKey="segment" stroke="#94a3b8" fontSize={11} />
            <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
            <Radar name="Recency (days)" dataKey="Recency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            <Radar name="Frequency (orders)" dataKey="Frequency" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="Monetary ($k)" dataKey="Monetary" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Segment summary table */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Segment Summary</h3>
            <p className="text-xs text-slate-400">Click any segment row to inspect actual customers</p>
          </div>
          {selectedSegment && (
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 hover:text-brand-500 font-medium"
            >
              Clear Selection
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="pb-2 font-medium">Segment</th>
                <th className="pb-2 px-4 font-medium">Customers</th>
                <th className="pb-2 px-4 font-medium">Revenue</th>
                <th className="pb-2 px-4 font-medium">Avg Recency</th>
                <th className="pb-2 px-4 font-medium">Avg Frequency</th>
                <th className="pb-2 pl-4 font-medium text-right">% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              {segmentStats.map((s) => (
                <tr
                  key={s.name}
                  onClick={() => setSelectedSegment(s.name === selectedSegment ? null : s.name)}
                  className={`border-b last:border-0 cursor-pointer transition-colors ${selectedSegment === s.name ? 'bg-brand-500/10' : 'hover:bg-slate-500/5'}`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[s.name] ?? '#3b82f6' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      {selectedSegment === s.name && <Badge className="text-xs text-brand-500 bg-brand-500/10">Selected</Badge>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.count}</td>
                  <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.revenue)}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{s.avgRecency}d</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{s.avgFreq}</td>
                  <td className="py-3 pl-4 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                    {totalRevenue ? ((s.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customers in Selected Segment */}
      {selectedSegment && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: SEGMENT_COLORS[selectedSegment] ?? '#3b82f6' }} />
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {selectedSegment} — Customer Roster ({selectedCustomers.length} customers)
              </h3>
            </div>
            <button
              onClick={() => navigate('/campaigns')}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 flex items-center gap-1"
            >
              Target in Campaign <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {selectedCustomers.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No customers found in this segment</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 px-4 font-medium">Company</th>
                    <th className="pb-2 px-4 font-medium">Total Spent</th>
                    <th className="pb-2 px-4 font-medium">Orders</th>
                    <th className="pb-2 px-4 font-medium">Last Purchase</th>
                    <th className="pb-2 pl-4 font-medium text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-500/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: c.avatar_color || '#3b82f6' }}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                            <p className="text-xs text-slate-400">{c.email || c.phone || 'No direct contact'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-sm text-slate-400">{c.company || '—'}</td>
                      <td className="py-2.5 px-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(c.total_spent))}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-400">{c.total_orders}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-400">{c.last_purchase_date || 'N/A'}</td>
                      <td className="py-2.5 pl-4 text-right">
                        <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1 rounded text-brand-500 hover:bg-brand-500/10">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
