import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingDown, AlertTriangle, Shield, Target } from 'lucide-react';
import { PageHeader, Card, StatCard, Badge, LoadingSpinner } from '@/components/ui';
import { useChurnPredictions } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { getRiskColor } from '@/lib/utils';

export default function ChurnPrediction() {
  const { activeDatasetId } = useDataset();
  const { data: predictions, loading } = useChurnPredictions(activeDatasetId);

  const stats = useMemo(() => {
    const high = predictions.filter((p) => p.risk_level === 'High').length;
    const medium = predictions.filter((p) => p.risk_level === 'Medium').length;
    const low = predictions.filter((p) => p.risk_level === 'Low').length;
    const avgProb = predictions.length ? predictions.reduce((s, p) => s + Number(p.churn_probability), 0) / predictions.length : 0;
    return { high, medium, low, avgProb, total: predictions.length };
  }, [predictions]);

  const pieData = [
    { name: 'High Risk', value: stats.high, color: '#ef4444' },
    { name: 'Medium Risk', value: stats.medium, color: '#f59e0b' },
    { name: 'Low Risk', value: stats.low, color: '#10b981' },
  ].filter((d) => d.value > 0);

  const barData = useMemo(() => {
    return predictions.slice(0, 15).map((p) => ({
      name: p.customer?.name?.split(' ')[0] ?? 'Unknown',
      probability: Math.round(Number(p.churn_probability) * 100),
      risk: p.risk_level,
    }));
  }, [predictions]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Churn Prediction" subtitle="AI-powered churn risk assessment with retention strategies" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Predictions" value={stats.total} icon={TrendingDown} color="#3b82f6" />
        <StatCard label="High Risk" value={stats.high} icon={AlertTriangle} color="#ef4444" />
        <StatCard label="Medium Risk" value={stats.medium} icon={Shield} color="#f59e0b" />
        <StatCard label="Avg Churn Prob" value={`${(stats.avgProb * 100).toFixed(1)}%`} icon={Target} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value">
                {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Churn Probability by Customer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} unit="%" />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Bar dataKey="probability" name="Churn %" radius={[0, 4, 4, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.risk === 'High' ? '#ef4444' : d.risk === 'Medium' ? '#f59e0b' : '#10b981'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Predictions table */}
      <Card>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>At-Risk Customers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 px-4 font-medium">Probability</th>
                <th className="pb-2 px-4 font-medium">Risk</th>
                <th className="pb-2 px-4 font-medium">Confidence</th>
                <th className="pb-2 px-4 font-medium hidden md:table-cell">Reasons</th>
                <th className="pb-2 pl-4 font-medium hidden lg:table-cell">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.customer?.name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-500/20 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Number(p.churn_probability) * 100}%`, background: p.risk_level === 'High' ? '#ef4444' : p.risk_level === 'Medium' ? '#f59e0b' : '#10b981' }} />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{(Number(p.churn_probability) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><Badge className={getRiskColor(p.risk_level)}>{p.risk_level}</Badge></td>
                  <td className="py-3 px-4 text-sm text-slate-400">{(Number(p.confidence_score) * 100).toFixed(0)}%</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.reasons.map((r, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-500/10" style={{ color: 'var(--text-secondary)' }}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pl-4 hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>{p.suggested_strategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
