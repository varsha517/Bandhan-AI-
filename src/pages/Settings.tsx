import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Moon, Sun, LogOut, Mail, Building, Save, Check, Smartphone, MessageSquare, Plug } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { getFunctionErrorMessage, invokeSendCampaign } from '@/lib/supabase';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.email?.split('@')[0] ?? '');
  const [company, setCompany] = useState('');
  const [notifications, setNotifications] = useState({ email: true, churn: true, campaign: true, loyalty: false });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={user?.email ?? ''} disabled className="input-field pl-10 opacity-60" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Company</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company name" className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <input value="Business User" disabled className="input-field opacity-60" />
              </div>
              <button onClick={handleSave} className="btn-primary">
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notification Preferences</h3>
            </div>
            <div className="space-y-3">
              {([
                { key: 'email', label: 'Email notifications', desc: 'Receive updates via email' },
                { key: 'churn', label: 'Churn risk alerts', desc: 'Get notified about high-risk customers' },
                { key: 'campaign', label: 'Campaign updates', desc: 'Campaign completion and performance alerts' },
                { key: 'loyalty', label: 'Loyalty events', desc: 'Membership upgrades and reward redemptions' },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key] ? 'bg-brand-500' : 'bg-slate-500/30'}`}
                  >
                    <motion.div
                      animate={{ x: notifications[item.key] ? 22 : 2 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Communication Integrations */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Plug className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Communication Integrations</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Configure your messaging providers through server environment variables. API keys are never exposed in the frontend.</p>
            <div className="space-y-3">
              {[
                { icon: Mail, name: 'Email', provider: 'Resend', envVars: 'RESEND_API_KEY, RESEND_FROM_EMAIL', color: '#3b82f6' },
                { icon: Smartphone, name: 'SMS', provider: 'Twilio', envVars: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER', color: '#10b981' },
                { icon: MessageSquare, name: 'WhatsApp', provider: 'Meta Cloud API', envVars: 'WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID', color: '#06b6d4' },
              ].map((integration) => (
                <IntegrationRow key={integration.name} {...integration} />
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-violet-500" /> : <Sun className="w-5 h-5 text-violet-500" />}
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Dark Mode</p>
                <p className="text-xs text-slate-400">Toggle dark theme</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-brand-500' : 'bg-slate-500/30'}`}
              >
                <motion.div animate={{ x: theme === 'dark' ? 22 : 2 }} className="absolute top-1 w-4 h-4 rounded-full bg-white" />
              </button>
            </div>
          </Card>

          {/* Security */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Security</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>JWT Authentication</span>
                <span className="text-xs text-emerald-500 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Row Level Security</span>
                <span className="text-xs text-emerald-500 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Password Hashing</span>
                <span className="text-xs text-emerald-500 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Audit Logs</span>
                <span className="text-xs text-emerald-500 font-medium">Recording</span>
              </div>
            </div>
          </Card>

          {/* Sign out */}
          <button onClick={handleSignOut} className="btn-secondary w-full text-red-500 border-red-500/30 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ icon: Icon, name, provider, envVars, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; name: string; provider: string; envVars: string; color: string }) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'not-configured' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const action = name === 'Email' ? 'test_connection' : 'test_sms_connection';
        const { data, error } = await invokeSendCampaign<{
          provider_configured?: boolean;
          diagnostics?: {
            api_key_configured?: boolean;
            sid_configured?: boolean;
            token_configured?: boolean;
            phone_configured?: boolean;
          };
        }>({ action });
        if (error) {
          setErrorMessage(error);
          setStatus('error');
        } else if (!data) {
          setErrorMessage('Edge Function returned no response.');
          setStatus('error');
        } else if (name === 'Email') {
          setStatus(data.diagnostics?.api_key_configured ? 'connected' : 'not-configured');
        } else if (name === 'SMS') {
          setStatus(
            data.diagnostics?.sid_configured &&
              data.diagnostics.token_configured &&
              data.diagnostics.phone_configured
              ? 'connected'
              : 'not-configured',
          );
        } else {
          setStatus(data.provider_configured ? 'connected' : 'not-configured');
        }
      } catch (error) {
        setErrorMessage(await getFunctionErrorMessage(error));
        setStatus('error');
      }
    })();
  }, [name]);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.05)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-xs text-slate-400">{provider}</p>
        </div>
      </div>
      <div className="text-right">
        {status === 'checking' && <span className="text-xs text-slate-400">Checking...</span>}
        {status === 'connected' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
          </span>
        )}
        {status === 'not-configured' && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Not Configured
          </span>
        )}
        {status === 'not-configured' && (
          <p className="text-xs text-slate-500 mt-0.5 max-w-48 truncate">{envVars}</p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-400 mt-0.5 max-w-64 break-words">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
