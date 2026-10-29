import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, GitBranch, TrendingDown, Award, Smile,
  Mail, Bot, FileText, Bell, UploadCloud, Settings, LogOut,
  Menu, X, Moon, Sun, ChevronDown, Search, Database,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useDataset } from '@/lib/dataset-context';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/segmentation', label: 'Segmentation', icon: GitBranch },
  { to: '/churn', label: 'Churn Prediction', icon: TrendingDown },
  { to: '/loyalty', label: 'Loyalty', icon: Award },
  { to: '/sentiment', label: 'Sentiment', icon: Smile },
  { to: '/campaigns', label: 'Campaigns', icon: Mail },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/datasets', label: 'Datasets', icon: UploadCloud },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { datasets, activeDatasetId, setActiveDatasetId } = useDataset();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 z-40 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold gradient-text">Bandhai AI</span>
              <p className="text-[10px] text-slate-400 -mt-0.5">CRM Platform</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
            >
              <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.email?.split('@')[0] ?? 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 py-3"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="input-field pl-9 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Dataset Selector */}
            <div className="relative">
              <button
                onClick={() => setDatasetOpen(!datasetOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-500/10 transition-colors text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Database className="w-4 h-4 text-brand-500" />
                <span className="hidden sm:inline max-w-[160px] truncate">
                  {activeDatasetId ? (datasets.find((d) => d.id === activeDatasetId)?.filename ?? 'Unknown') : 'All Datasets'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <AnimatePresence>
                {datasetOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 mt-2 w-64 rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    onClick={() => setDatasetOpen(false)}
                  >
                    <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-2">Active Dataset</p>
                    </div>
                    <button
                      onClick={() => setActiveDatasetId(null)}
                      className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-500/10 transition-colors', !activeDatasetId && 'bg-brand-500/10')}
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Database className="w-4 h-4 text-slate-400" />
                      <span>All Datasets</span>
                    </button>
                    {datasets.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActiveDatasetId(d.id)}
                        className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-500/10 transition-colors', activeDatasetId === d.id && 'bg-brand-500/10')}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Database className="w-4 h-4 text-brand-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{d.filename}</p>
                          <p className="text-xs text-slate-400">{d.row_count} rows · {d.status}</p>
                        </div>
                      </button>
                    ))}
                    {datasets.length === 0 && (
                      <p className="px-3 py-3 text-xs text-slate-400">No datasets uploaded yet</p>
                    )}
                    <button
                      onClick={() => { setDatasetOpen(false); navigate('/datasets'); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-500/10 transition-colors border-t text-brand-500"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <UploadCloud className="w-4 h-4" /> Manage Datasets
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <NavLink
              to="/notifications"
              className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors relative"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </NavLink>
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-500/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg overflow-hidden z-50"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
                      <p className="text-xs text-slate-400">Business User</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-500/10 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
