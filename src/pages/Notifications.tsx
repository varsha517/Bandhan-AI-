import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, UserPlus, ArrowUpCircle, CheckCircle, Gift,
  UploadCloud, Lightbulb, FileText, Bell, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { useNotifications } from '@/lib/hooks';
import { formatRelativeTime } from '@/lib/utils';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'alert-triangle': AlertTriangle,
  'user-plus': UserPlus,
  'arrow-up-circle': ArrowUpCircle,
  'check-circle': CheckCircle,
  gift: Gift,
  'upload-cloud': UploadCloud,
  lightbulb: Lightbulb,
  'file-text': FileText,
};

const TYPE_COLORS: Record<string, string> = {
  Warning: '#f59e0b',
  Success: '#10b981',
  Info: '#3b82f6',
  Error: '#ef4444',
};

export default function Notifications() {
  const { data: notifications, loading, setData } = useNotifications();

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    setData(notifications.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = async (id: string) => {
    const n = notifications.find((x) => x.id === id);
    if (!n) return;
    await supabase.from('notifications').update({ read: !n.read }).eq('id', id);
    setData(notifications.map((x) => x.id === id ? { ...x, read: !x.read } : x));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread of ${notifications.length} total`}
        action={unreadCount > 0 ? <button onClick={markAllRead} className="btn-secondary"><Check className="w-4 h-4" /> Mark all read</button> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" subtitle="You are all caught up" />
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => {
            const Icon = ICONS[n.icon] ?? Bell;
            const color = TYPE_COLORS[n.type] ?? '#3b82f6';
            return (
              <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="cursor-pointer hover:border-brand-500/30" >
                  <div className="flex items-start gap-3" onClick={() => toggleRead(n.id)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className="text-xs" style={{ color, background: `${color}10`, borderColor: `${color}20` }}>{n.type}</Badge>
                        <span className="text-xs text-slate-400">{formatRelativeTime(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
