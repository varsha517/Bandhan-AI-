import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { Award, Crown, Gift, Star, TrendingUp } from 'lucide-react';
import { PageHeader, Card, StatCard, Badge, LoadingSpinner } from '@/components/ui';
import { useLoyaltyAccounts, useMembershipTiers, useRewards } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatNumber, getTierColor } from '@/lib/utils';

export default function Loyalty() {
  const { activeDatasetId } = useDataset();
  const { data: accounts, loading } = useLoyaltyAccounts(activeDatasetId);
  const { data: tiers } = useMembershipTiers();
  const { data: rewards } = useRewards();

  const stats = useMemo(() => {
    const totalPoints = accounts.reduce((s, a) => s + a.points, 0);
    const totalRedeemed = accounts.reduce((s, a) => s + a.points_redeemed, 0);
    const tierCounts: Record<string, number> = {};
    accounts.forEach((a) => { tierCounts[a.tier_name] = (tierCounts[a.tier_name] ?? 0) + 1; });
    return { totalPoints, totalRedeemed, tierCounts, total: accounts.length };
  }, [accounts]);

  const tierData = useMemo(() => {
    const sorted = [...tiers].sort((a, b) => a.display_order - b.display_order);
    return sorted.map((tier) => ({
      name: tier.name,
      members: stats.tierCounts[tier.name] ?? 0,
      color: tier.color,
    }));
  }, [stats, tiers]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Loyalty Management" subtitle="Membership tiers, points, and rewards" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Loyalty Members" value={stats.total} icon={Award} color="#3b82f6" />
        <StatCard label="Total Points" value={formatNumber(stats.totalPoints)} icon={Star} color="#f59e0b" />
        <StatCard label="Points Redeemed" value={formatNumber(stats.totalRedeemed)} icon={Gift} color="#10b981" />
        <StatCard label="Active Rewards" value={rewards.length} icon={Crown} color="#8b5cf6" />
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiers.sort((a, b) => a.display_order - b.display_order).map((tier) => (
          <Card key={tier.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${tier.color}20`, color: tier.color }}>
                <Crown className="w-5 h-5" />
              </div>
              <Badge className={getTierColor(tier.name)}>{tier.name}</Badge>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.tierCounts[tier.name] ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1">Members</p>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs text-slate-400 mb-1">Benefits</p>
              <ul className="space-y-1">
                {tier.benefits.map((b, i) => (
                  <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: tier.color }} /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + Rewards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Members by Tier</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Bar dataKey="members" radius={[4, 4, 0, 0]}>
                {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Available Rewards</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-xs text-slate-400 truncate">{r.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-brand-500">{r.points_cost}</p>
                  <p className="text-xs text-slate-400">points</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Loyalty accounts table */}
      <Card>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Loyalty Accounts</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 px-4 font-medium">Tier</th>
                <th className="pb-2 px-4 font-medium">Points</th>
                <th className="pb-2 px-4 font-medium hidden md:table-cell">Lifetime</th>
                <th className="pb-2 px-4 font-medium hidden md:table-cell">Redeemed</th>
                <th className="pb-2 pl-4 font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.customer?.name ?? '—'}</td>
                  <td className="py-3 px-4"><Badge className={getTierColor(a.tier_name)}>{a.tier_name}</Badge></td>
                  <td className="py-3 px-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{a.points.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-400 hidden md:table-cell">{a.lifetime_points.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-400 hidden md:table-cell">{a.points_redeemed.toLocaleString()}</td>
                  <td className="py-3 pl-4 text-sm text-slate-400 hidden lg:table-cell">{new Date(a.joined_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
