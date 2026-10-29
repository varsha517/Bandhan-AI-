import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, Users, GitBranch, TrendingDown, Award, Smile, Mail,
  FileText, UploadCloud, Shield, Zap, BarChart3, ArrowRight,
  Check, Star,
} from 'lucide-react';

const features = [
  { icon: Users, title: 'Customer Management', desc: 'Add, edit, search, and filter customers with detailed profiles.' },
  { icon: GitBranch, title: 'RFM Segmentation', desc: 'K-Means clustering and RFM analysis for smart customer segments.' },
  { icon: TrendingDown, title: 'Churn Prediction', desc: 'AI-powered churn probability with retention strategies.' },
  { icon: Award, title: 'Loyalty Programs', desc: 'Tier-based rewards, points, and membership management.' },
  { icon: Smile, title: 'Sentiment Analysis', desc: 'Analyze reviews and feedback with AI sentiment scoring.' },
  { icon: Mail, title: 'AI Campaign Generator', desc: 'Personalized email, SMS, and WhatsApp campaigns.' },
  { icon: Bot, title: 'AI Assistant', desc: 'Ask questions in natural language about your business.' },
  { icon: BarChart3, title: 'Business Intelligence', desc: 'Real-time dashboards with animated charts and metrics.' },
];

const stats = [
  { value: '24+', label: 'Sample Customers' },
  { value: '5', label: 'Campaign Types' },
  { value: '4', label: 'Loyalty Tiers' },
  { value: '9', label: 'Segments' },
];

const plans = [
  {
    name: 'Starter', price: '$0', period: 'forever',
    features: ['Up to 100 customers', 'Basic segmentation', 'Dashboard analytics', 'Email support'],
    cta: 'Get Started', highlight: false,
  },
  {
    name: 'Professional', price: '$49', period: 'per month',
    features: ['Up to 10,000 customers', 'AI churn prediction', 'Sentiment analysis', 'Campaign generator', 'Priority support', 'Custom reports'],
    cta: 'Start Free Trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    features: ['Unlimited customers', 'Custom AI models', 'Dedicated account manager', 'API access', 'SSO & SAML', '24/7 support'],
    cta: 'Contact Sales', highlight: false,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg" style={{ background: 'rgba(10,14,26,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Bandhai AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#workflow" className="hover:text-white transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2">
              Sign in
            </button>
            <button onClick={() => navigate('/auth')} className="btn-primary text-sm">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-6">
              <Zap className="w-4 h-4" /> AI-Powered CRM Platform
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight">
              Transform customer relationships with{' '}
              <span className="gradient-text">AI intelligence</span>
            </h1>
            <p className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto">
              Upload your data, let AI handle segmentation, churn prediction, sentiment analysis,
              and campaign generation. All in one beautiful, enterprise-grade platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button onClick={() => navigate('/auth')} className="btn-primary text-base px-6 py-3">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/auth')} className="btn-secondary text-base px-6 py-3 text-slate-300 border-slate-600">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold gradient-text">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to grow</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              From data upload to AI-powered campaigns, Bandhai AI covers the entire customer lifecycle.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                  <f.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 mt-2">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How it works</h2>
            <p className="text-slate-400 mt-4">From raw data to actionable insights in 5 steps</p>
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {[
              { step: '01', title: 'Upload Dataset', desc: 'Drag and drop CSV, Excel files', icon: UploadCloud },
              { step: '02', title: 'AI Preprocessing', desc: 'Auto-clean, detect schema, handle missing values', icon: Zap },
              { step: '03', title: 'Segmentation', desc: 'RFM analysis and K-Means clustering', icon: GitBranch },
              { step: '04', title: 'AI Insights', desc: 'Churn, sentiment, and recommendations', icon: Bot },
              { step: '05', title: 'Act & Report', desc: 'Generate campaigns and export reports', icon: FileText },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-1 relative"
              >
                <div className="glass-card text-center">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                    <s.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xs font-bold text-brand-400 mb-1">{s.step}</p>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="text-xs text-slate-400 mt-2">{s.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-slate-600" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Simple, transparent pricing</h2>
            <p className="text-slate-400 mt-4">Choose the plan that fits your business</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`glass-card relative ${p.highlight ? 'border-brand-500/40' : ''}`}
                style={p.highlight ? { boxShadow: '0 0 40px rgba(59,130,246,0.15)' } : {}}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-bg text-white text-xs font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-bold text-white">{p.price}</span>
                  {p.period && <span className="text-sm text-slate-400">/{p.period}</span>}
                </div>
                <ul className="space-y-3 mt-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/auth')}
                  className={`w-full mt-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    p.highlight ? 'gradient-bg text-white hover:opacity-90' : 'btn-secondary'
                  }`}
                >
                  {p.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="glass-card text-center py-12" style={{ background: 'rgba(59,130,246,0.05)' }}>
            <Shield className="w-12 h-12 text-brand-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
            <p className="text-slate-400 mt-4">
              Join businesses using Bandhai AI to understand, retain, and grow their customer base.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-primary text-base px-6 py-3 mt-6">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">Bandhai AI</span>
          </div>
          <p className="text-sm text-slate-400">© 2026 Bandhai AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
