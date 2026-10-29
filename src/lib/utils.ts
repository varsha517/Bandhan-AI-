import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'Low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}

export function getSentimentColor(label: string): string {
  switch (label) {
    case 'Positive': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'Neutral': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'Negative': return 'text-red-500 bg-red-500/10 border-red-500/20';
    default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
    case 'Completed':
    case 'Processed':
    case 'sent':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'At Risk':
    case 'Partially Completed':
    case 'partially_failed':
    case 'pending':
    case 'queued':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'Lost':
    case 'Failed':
    case 'failed':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'Sending':
    case 'sending':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'Draft':
    case 'draft':
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'Platinum': return 'text-slate-300 bg-slate-300/10 border-slate-300/20';
    case 'Gold': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    case 'Silver': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    case 'Bronze': return 'text-orange-600 bg-orange-600/10 border-orange-600/20';
    default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}
