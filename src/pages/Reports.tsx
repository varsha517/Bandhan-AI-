import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Plus, X, FileSpreadsheet, FileBarChart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { useReports, useCustomers, useCampaigns, useLoyaltyAccounts, useChurnPredictions, useSentiments } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatCurrency, formatDate } from '@/lib/utils';

const REPORT_TYPES = [
  { type: 'Customer Analytics', icon: FileBarChart, color: '#3b82f6', desc: 'Customer demographics, segments, and growth' },
  { type: 'Revenue Analysis', icon: FileText, color: '#10b981', desc: 'Revenue trends, breakdowns, and forecasts' },
  { type: 'Loyalty Statistics', icon: FileText, color: '#f59e0b', desc: 'Loyalty tiers, points, and engagement' },
  { type: 'Campaign Performance', icon: FileText, color: '#8b5cf6', desc: 'Campaign metrics and ROI analysis' },
  { type: 'Churn Analysis', icon: FileText, color: '#ef4444', desc: 'Churn risk distribution and retention' },
];

function buildCSV(type: string, customers: any[], campaigns: any[], loyalty: any[], churn: any[], sentiments: any[]): string {
  if (type === 'Customer Analytics') {
    const rows = [['Name', 'Email', 'Company', 'Location', 'Segment', 'Status', 'Total Spent', 'Total Orders', 'Churn Risk', 'Sentiment']];
    customers.forEach((c) => {
      rows.push([c.name, c.email ?? '', c.company ?? '', c.location ?? '', c.segment, c.status, String(c.total_spent), String(c.total_orders), c.churn_risk, c.sentiment_label]);
    });
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
  if (type === 'Revenue Analysis') {
    const segRev: Record<string, number> = {};
    customers.forEach((c) => { segRev[c.segment] = (segRev[c.segment] ?? 0) + Number(c.total_spent); });
    const rows = [['Segment', 'Total Revenue', 'Customer Count', 'Avg Revenue Per Customer']];
    Object.entries(segRev).forEach(([seg, rev]) => {
      const count = customers.filter((c) => c.segment === seg).length;
      rows.push([seg, String(rev), String(count), String(count ? Math.round(rev / count) : 0)]);
    });
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
  if (type === 'Loyalty Statistics') {
    const rows = [['Customer', 'Tier', 'Points', 'Lifetime Points', 'Points Redeemed']];
    loyalty.forEach((l) => {
      rows.push([l.customer?.name ?? 'Unknown', l.tier_name, String(l.points), String(l.lifetime_points), String(l.points_redeemed)]);
    });
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
  if (type === 'Campaign Performance') {
    const rows = [['Campaign', 'Channel', 'Segment', 'Status', 'Open Rate', 'Click Rate', 'Conversion Rate', 'Success Rate', 'Audience']];
    campaigns.forEach((c) => {
      rows.push([c.name, c.channel, c.target_segment ?? 'All', c.status, String(c.open_rate), String(c.click_rate), String(c.conversion_rate), String(c.success_rate), String(c.target_audience_count)]);
    });
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
  if (type === 'Churn Analysis') {
    const rows = [['Customer', 'Churn Probability', 'Risk Level', 'Confidence Score', 'Reasons', 'Suggested Strategy']];
    churn.forEach((p) => {
      rows.push([p.customer?.name ?? 'Unknown', String(p.churn_probability), p.risk_level, String(p.confidence_score), (p.reasons ?? []).join('; '), p.suggested_strategy ?? '']);
    });
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
  return '';
}

function buildSummary(type: string, customers: any[], campaigns: any[], loyalty: any[], churn: any[], sentiments: any[]): string {
  const totalRev = customers.reduce((s, c) => s + Number(c.total_spent), 0);
  if (type === 'Customer Analytics') {
    const segCounts: Record<string, number> = {};
    customers.forEach((c) => { segCounts[c.segment] = (segCounts[c.segment] ?? 0) + 1; });
    const segBreakdown = Object.entries(segCounts).map(([s, n]) => `${s}: ${n}`).join(', ');
    return `${customers.length} total customers across segments — ${segBreakdown}. Total revenue: ${formatCurrency(totalRev)}.`;
  }
  if (type === 'Revenue Analysis') {
    const segRev: Record<string, number> = {};
    customers.forEach((c) => { segRev[c.segment] = (segRev[c.segment] ?? 0) + Number(c.total_spent); });
    const top = Object.entries(segRev).sort((a, b) => b[1] - a[1])[0];
    return `Total revenue: ${formatCurrency(totalRev)} across ${customers.length} customers. Top segment: ${top?.[0]} at ${formatCurrency(top?.[1] ?? 0)}.`;
  }
  if (type === 'Loyalty Statistics') {
    const totalPoints = loyalty.reduce((s, l) => s + l.points, 0);
    const tierCounts: Record<string, number> = {};
    loyalty.forEach((l) => { tierCounts[l.tier_name] = (tierCounts[l.tier_name] ?? 0) + 1; });
    const tierBreakdown = Object.entries(tierCounts).map(([t, n]) => `${t}: ${n}`).join(', ');
    return `${loyalty.length} loyalty members with ${totalPoints.toLocaleString()} total points. Tier distribution — ${tierBreakdown}.`;
  }
  if (type === 'Campaign Performance') {
    const avgSuccess = campaigns.length ? (campaigns.reduce((s, c) => s + Number(c.success_rate), 0) / campaigns.length * 100).toFixed(0) : '0';
    return `${campaigns.length} campaigns with ${avgSuccess}% average success rate. ${campaigns.filter((c) => c.status === 'Active').length} active, ${campaigns.filter((c) => c.status === 'Completed').length} completed.`;
  }
  if (type === 'Churn Analysis') {
    const high = churn.filter((p) => p.risk_level === 'High').length;
    const medium = churn.filter((p) => p.risk_level === 'Medium').length;
    return `${churn.length} churn predictions: ${high} high risk, ${medium} medium risk. Immediate retention action recommended for high-risk customers.`;
  }
  return '';
}

function downloadFile(content: string, filename: string, format: string) {
  const mime = format === 'Excel' ? 'text/csv' : 'text/csv';
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { activeDatasetId } = useDataset();
  const { data: reports, loading, setData } = useReports(activeDatasetId);
  const { data: customers } = useCustomers(activeDatasetId);
  const { data: campaigns } = useCampaigns(activeDatasetId);
  const { data: loyalty } = useLoyaltyAccounts(activeDatasetId);
  const { data: churn } = useChurnPredictions(activeDatasetId);
  const { data: sentiments } = useSentiments(activeDatasetId);
  const [showGen, setShowGen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (type: string, format: string) => {
    setGenerating(true);
    const summary = buildSummary(type, customers, campaigns, loyalty, churn, sentiments);
    const csvContent = buildCSV(type, customers, campaigns, loyalty, churn, sentiments);
    const dateRange = `Last 90 days (${new Date(Date.now() - 90 * 86400000).toLocaleDateString()} - ${new Date().toLocaleDateString()})`;
    const { data: created } = await supabase.from('reports').insert({
      title: `${type} — ${new Date().toLocaleDateString()}`,
      type,
      format,
      date_range: dateRange,
      summary,
      data: { csvContent, totalCustomers: customers.length, totalCampaigns: campaigns.length, loyaltyMembers: loyalty.length, churnPredictions: churn.length },
      status: 'Generated',
      dataset_id: activeDatasetId,
    }).select().single();
    if (created) setData([created, ...reports]);
    setGenerating(false);
    setShowGen(false);
    downloadFile(csvContent, `${type.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, format);
  };

  const handleDownload = (report: any) => {
    const csvContent = report.data?.csvContent ?? '';
    if (csvContent) {
      downloadFile(csvContent, `${report.type.replace(/\s+/g, '_')}_${report.title.split('—')[1]?.trim() ?? ''}.csv`, report.format);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and download business analytics reports with real data"
        action={<button onClick={() => setShowGen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Generate Report</button>}
      />

      {reports.length === 0 && !showGen ? (
        <EmptyState icon={FileText} title="No reports yet" subtitle="Generate your first analytics report from live data" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      {r.format === 'Excel' ? <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-brand-500" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</h3>
                      <p className="text-xs text-slate-400">{r.type} · {r.format}</p>
                    </div>
                  </div>
                  <Badge className="text-emerald-500 bg-emerald-500/10 border-emerald-500/20">{r.status}</Badge>
                </div>
                {r.summary && <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{r.summary}</p>}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                  <button onClick={() => handleDownload(r)} className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {showGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate Report</h2>
              <button onClick={() => setShowGen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Reports are generated from your live data: {customers.length} customers, {campaigns.length} campaigns, {loyalty.length} loyalty accounts, {churn.length} churn predictions.</p>
            <div className="space-y-3">
              {REPORT_TYPES.map((rt) => (
                <div key={rt.type} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-500/5 transition-colors" style={{ border: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${rt.color}15`, color: rt.color }}>
                    <rt.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rt.type}</p>
                    <p className="text-xs text-slate-400">{rt.desc}</p>
                  </div>
                  <button onClick={() => handleGenerate(rt.type, 'CSV')} disabled={generating} className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-brand-500/10 hover:text-brand-500 font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 inline mr-1" /> CSV</>}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
