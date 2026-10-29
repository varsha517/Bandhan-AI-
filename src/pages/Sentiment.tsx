import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Smile, Frown, Meh, ThumbsUp, MessageSquare } from 'lucide-react';
import { PageHeader, Card, StatCard, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { useSentiments } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { getSentimentColor } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';

export default function Sentiment() {
  const { activeDatasetId } = useDataset();
  const { data: sentiments, loading } = useSentiments(activeDatasetId);

  const stats = useMemo(() => {
    const positive = sentiments.filter((s) => s.sentiment_label === 'Positive').length;
    const neutral = sentiments.filter((s) => s.sentiment_label === 'Neutral').length;
    const negative = sentiments.filter((s) => s.sentiment_label === 'Negative').length;
    const avgScore = sentiments.length ? sentiments.reduce((s, x) => s + Number(x.sentiment_score), 0) / sentiments.length : 0;
    return { positive, neutral, negative, avgScore, total: sentiments.length };
  }, [sentiments]);

  const pieData = [
    { name: 'Positive', value: stats.positive, color: '#10b981' },
    { name: 'Neutral', value: stats.neutral, color: '#3b82f6' },
    { name: 'Negative', value: stats.negative, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const trendData = useMemo(() => {
    const now = new Date();
    const months: { month: string; positive: number; neutral: number; negative: number }[] = [];
    for (let i = 8; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthSentiments = sentiments.filter((s) => {
        const sd = new Date(s.created_at);
        return sd >= monthStart && sd <= monthEnd;
      });
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        positive: monthSentiments.filter((s) => s.sentiment_label === 'Positive').length,
        neutral: monthSentiments.filter((s) => s.sentiment_label === 'Neutral').length,
        negative: monthSentiments.filter((s) => s.sentiment_label === 'Negative').length,
      });
    }
    return months;
  }, [sentiments]);

  if (loading) return <LoadingSpinner />;

  if (sentiments.length === 0) {
    return (
      <div>
        <PageHeader title="Sentiment Analysis" subtitle="AI-powered analysis of customer reviews and feedback" />
        <EmptyState icon={UploadCloud} title="No sentiment data available" subtitle="Upload a CSV with review, feedback, comment, or rating columns to see sentiment analysis" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sentiment Analysis" subtitle="AI-powered analysis of customer reviews and feedback" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.total} icon={MessageSquare} color="#3b82f6" />
        <StatCard label="Positive" value={stats.positive} icon={Smile} color="#10b981" />
        <StatCard label="Neutral" value={stats.neutral} icon={Meh} color="#3b82f6" />
        <StatCard label="Negative" value={stats.negative} icon={Frown} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
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
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="neutral" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Reviews & Feedback</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sentiments.map((s) => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                background: s.sentiment_label === 'Positive' ? 'rgba(16,185,129,0.1)' : s.sentiment_label === 'Neutral' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
              }}>
                {s.sentiment_label === 'Positive' ? <Smile className="w-5 h-5 text-emerald-500" /> : s.sentiment_label === 'Neutral' ? <Meh className="w-5 h-5 text-blue-500" /> : <Frown className="w-5 h-5 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.customer?.name ?? 'Anonymous'}</p>
                  <Badge className={getSentimentColor(s.sentiment_label)}>{s.sentiment_label}</Badge>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-400">Score: {Number(s.sentiment_score).toFixed(1)}</span>
                  {s.rating && <span className="text-xs text-slate-400">Rating: {s.rating}/5</span>}
                  <span className="text-xs text-slate-400">{s.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
