import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Download, Eye, Edit2, Trash2, Users, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomers, useDatasets } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { PageHeader, Card, Badge, EmptyState, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, getInitials, getStatusColor, getRiskColor } from '@/lib/utils';
import type { Customer, UploadedDataset } from '@/lib/types';

const SEGMENTS = [
  'All', 'Champions', 'Loyal Customers', 'Potential Loyalists', 'New Customers',
  'Promising', 'Need Attention', 'At Risk', "Can't Lose Them", 'Hibernating', 'Lost'
];
const STATUSES = ['All', 'Active', 'At Risk', 'Lost'];

export default function Customers() {
  const { activeDatasetId, setActiveDatasetId, refreshDatasets } = useDataset();
  const { data: customers, loading, setData } = useCustomers(activeDatasetId);
  const { data: datasets } = useDatasets();
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase());
      const matchesSegment = segmentFilter === 'All' || c.segment === segmentFilter;
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesSegment && matchesStatus;
    });
  }, [customers, search, segmentFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer? This will remove all their transactions, loyalty points, and campaign records.')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      alert(`Failed to delete customer: ${error.message}`);
      return;
    }
    setData(customers.filter((c) => c.id !== id));
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Location', 'Segment', 'Status', 'Total Spent', 'Total Orders', 'Churn Risk', 'Last Purchase'];
    const rows = filtered.map((c) => [
      `"${c.name}"`,
      `"${c.email ?? ''}"`,
      `"${c.phone ?? ''}"`,
      `"${c.company ?? ''}"`,
      `"${c.location ?? ''}"`,
      `"${c.segment}"`,
      `"${c.status}"`,
      c.total_spent,
      c.total_orders,
      `"${c.churn_risk}"`,
      `"${c.last_purchase_date ?? ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${filtered.length} of ${customers.length} customers in active dataset`}
        action={
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button onClick={handleExportCSV} className="btn-secondary">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
            <button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="input-field lg:w-44">
            {SEGMENTS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Segments' : s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field lg:w-36">
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          subtitle={
            !activeDatasetId
              ? 'No active dataset selected. Go to Datasets to upload or select a dataset.'
              : 'Try adjusting your search or filters, or add a customer to this dataset.'
          }
        />
      ) : (
        <Card className="overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 px-4 font-medium hidden md:table-cell">Company</th>
                  <th className="pb-3 px-4 font-medium hidden sm:table-cell">Segment</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium hidden lg:table-cell">Total Spent</th>
                  <th className="pb-3 px-4 font-medium hidden lg:table-cell">Churn Risk</th>
                  <th className="pb-3 px-4 font-medium hidden xl:table-cell">Last Purchase</th>
                  <th className="pb-3 pl-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-slate-500/5 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: c.avatar_color || '#3b82f6' }}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.email || c.phone || 'No direct contact'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{c.company || '—'}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-slate-500/10 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {c.segment}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(Number(c.total_spent))}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <Badge className={getRiskColor(c.churn_risk)}>{c.churn_risk}</Badge>
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-sm text-slate-400">{formatDate(c.last_purchase_date)}</td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1.5 rounded-lg hover:bg-brand-500/10 text-slate-400 hover:text-brand-500 transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditing(c); setShowAdd(true); }} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showAdd && (
        <CustomerModal
          customer={editing}
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          onClose={() => setShowAdd(false)}
          onSave={async (data, targetDatasetId) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, message: 'Must be authenticated' };

            let finalDatasetId = targetDatasetId || activeDatasetId;

            // If no dataset exists at all, create a default dataset to house manual entries
            if (!finalDatasetId) {
              const { data: newDs, error: dsErr } = await supabase.from('uploaded_datasets').insert({
                user_id: user.id,
                filename: 'Manual Customers Dataset',
                row_count: 1,
                column_count: 5,
                columns: ['name', 'email', 'phone', 'company', 'location'],
                quality_score: 100,
                status: 'Processed',
              }).select().single();
              if (dsErr || !newDs) {
                return { success: false, message: 'Could not create dataset container' };
              }
              finalDatasetId = newDs.id;
              await refreshDatasets();
              setActiveDatasetId(newDs.id);
            }

            if (editing) {
              const { data: updated, error } = await supabase
                .from('customers')
                .update({
                  name: data.name,
                  email: data.email || null,
                  phone: data.phone || null,
                  company: data.company || null,
                  location: data.location || null,
                  segment: data.segment,
                  status: data.status,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', editing.id)
                .select()
                .single();

              if (error || !updated) {
                return { success: false, message: error?.message ?? 'Failed to update customer' };
              }

              setData(customers.map((c) => (c.id === editing.id ? updated : c)));
              return { success: true, message: 'Customer updated successfully' };
            } else {
              const insertData = {
                user_id: user.id,
                dataset_id: finalDatasetId,
                name: data.name!,
                email: data.email || null,
                phone: data.phone || null,
                company: data.company || null,
                location: data.location || null,
                segment: data.segment || 'Regular',
                status: data.status || 'Active',
                churn_score: 0.1,
                churn_risk: 'Low',
                sentiment_score: 50,
                sentiment_label: 'Neutral',
                total_spent: 0,
                total_orders: 0,
                avatar_color: '#3b82f6',
              };

              const { data: created, error: custError } = await supabase
                .from('customers')
                .insert(insertData)
                .select()
                .single();

              if (custError || !created) {
                return { success: false, message: custError?.message ?? 'Failed to create customer' };
              }

              // Create linked loyalty, segment, churn records with user_id
              await supabase.from('loyalty_accounts').insert({
                user_id: user.id,
                customer_id: created.id,
                points: 100,
                tier_name: 'Bronze',
                lifetime_points: 100,
                points_redeemed: 0,
              });

              await supabase.from('segments').insert({
                user_id: user.id,
                customer_id: created.id,
                segment_name: created.segment,
                rfm_score: 3.0,
                recency_days: 0,
                frequency: 0,
                monetary: 0,
                cluster_label: 1,
              });

              await supabase.from('churn_predictions').insert({
                user_id: user.id,
                customer_id: created.id,
                churn_probability: 0.1,
                risk_level: 'Low',
                confidence_score: 0.85,
                reasons: ['New customer profile created'],
                suggested_strategy: 'Welcome onboarding sequence and product introduction',
                model_version: 'v1.0-rules',
              });

              setData([created, ...customers]);
              return { success: true, message: 'Customer created and permanently saved to active dataset!' };
            }
          }}
        />
      )}
    </div>
  );
}

interface SaveResult {
  success: boolean;
  message: string;
}

function CustomerModal({
  customer,
  datasets,
  activeDatasetId,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  datasets: UploadedDataset[];
  activeDatasetId: string | null;
  onClose: () => void;
  onSave: (data: Partial<Customer>, datasetId?: string | null) => Promise<SaveResult>;
}) {
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    company: customer?.company ?? '',
    location: customer?.location ?? '',
    segment: customer?.segment ?? 'Regular',
    status: customer?.status ?? 'Active',
  });
  const [datasetId, setDatasetId] = useState<string>(
    customer?.dataset_id ?? activeDatasetId ?? (datasets[0]?.id || '')
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setResult({ success: false, message: 'Customer name is required' });
      return;
    }
    setSaving(true);
    setResult(null);
    const res = await onSave(form, datasetId || activeDatasetId || null);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setTimeout(() => onClose(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={() => !saving && onClose()} className="text-slate-400 hover:text-red-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="rahul@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Company</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="input-field"
                placeholder="Company Pvt Ltd"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-field"
                placeholder="Mumbai, IN"
              />
            </div>
            {datasets.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Target Dataset *</label>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="input-field font-medium"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename} {d.id === activeDatasetId ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Segment</label>
              <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} className="input-field">
                {SEGMENTS.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                {['Active', 'At Risk', 'Lost'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {result.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
            <button type="button" onClick={() => !saving && onClose()} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
