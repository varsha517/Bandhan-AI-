import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';
import { useCustomers, useCampaigns, useLoyaltyAccounts, useChurnPredictions, useSentiments, useTransactions, useRecommendations } from '@/lib/hooks';
import { useDataset } from '@/lib/dataset-context';
import { formatCurrency } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Show customers likely to churn',
  'Which segment generates the highest revenue?',
  'Show top 10 loyal customers',
  'Summarize business performance',
  'Generate a campaign for Platinum members',
  'Which products sell the most?',
  'Show AI recommendations',
];

export default function AIAssistant() {
  const { activeDatasetId } = useDataset();
  const { data: customers } = useCustomers(activeDatasetId);
  const { data: campaigns } = useCampaigns(activeDatasetId);
  const { data: loyalty } = useLoyaltyAccounts(activeDatasetId);
  const { data: churn } = useChurnPredictions(activeDatasetId);
  const { data: sentiments } = useSentiments(activeDatasetId);
  const { data: transactions } = useTransactions(activeDatasetId);
  const { data: recommendations } = useRecommendations();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Bandhai AI assistant. Ask me anything about your customers, segments, churn risk, campaigns, products, or business performance.' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (customers.length === 0) {
      return 'No customer data available. Upload a dataset in the Dataset Upload module to start analyzing your business data.';
    }

    if (q.includes('recommend')) {
      if (recommendations.length === 0) return 'No AI recommendations have been generated yet. Recommendations are created based on customer behavior, segment analysis, and churn risk patterns.';
      return `Here are your AI-generated recommendations:\n\n${recommendations.map((r, i) => `${i + 1}. [${r.priority}] ${r.title}\n   ${r.description}\n   Potential value: ${formatCurrency(Number(r.potential_value))}`).join('\n\n')}\n\nPrioritize the High items first for maximum impact.`;
    }

    if (q.includes('churn') || q.includes('at risk')) {
      const highRisk = customers.filter((c) => c.churn_risk === 'High');
      const mediumRisk = customers.filter((c) => c.churn_risk === 'Medium');
      if (highRisk.length === 0 && mediumRisk.length === 0) return 'No customers are currently flagged as churn risk. All customers show normal activity patterns.';
      return `Based on the churn prediction model, you have ${highRisk.length} customers at High churn risk and ${mediumRisk.length} at Medium risk. Here are the high-risk customers:\n\n${highRisk.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} — ${(Number(c.churn_score) * 100).toFixed(0)}% probability (${c.company})`).join('\n')}\n\nRecommended action: Deploy personalized retention offers immediately for high-risk customers. Consider a win-back email campaign with special discounts.`;
    }

    if (q.includes('segment') && (q.includes('revenue') || q.includes('highest') || q.includes('best'))) {
      const segRev: Record<string, number> = {};
      customers.forEach((c) => { segRev[c.segment] = (segRev[c.segment] ?? 0) + Number(c.total_spent); });
      const sorted = Object.entries(segRev).sort((a, b) => b[1] - a[1]);
      return `Here is the revenue breakdown by segment:\n\n${sorted.map(([seg, rev], i) => `${i + 1}. ${seg}: ${formatCurrency(rev)}`).join('\n')}\n\nThe ${sorted[0]?.[0]} segment generates the highest revenue at ${formatCurrency(sorted[0]?.[1] ?? 0)}. Consider investing more in campaigns targeting this segment.`;
    }

    if (q.includes('top') && (q.includes('loyal') || q.includes('customer'))) {
      if (loyalty.length === 0) return 'No loyalty data available. Loyalty accounts are created when customers are imported from a dataset.';
      const top = [...loyalty].sort((a, b) => b.points - a.points).slice(0, 10);
      return `Here are your top 10 most loyal customers by loyalty points:\n\n${top.map((l, i) => `${i + 1}. ${l.customer?.name ?? 'Unknown'} — ${l.points.toLocaleString()} points (${l.tier_name})`).join('\n')}\n\nThese customers are your strongest advocates. Consider sending them exclusive rewards or VIP invitations.`;
    }

    if (q.includes('how many') && q.includes('gold')) {
      const goldCustomers = loyalty.filter((l) => l.tier_name === 'Gold');
      return `You have ${goldCustomers.length} Gold tier customers out of ${loyalty.length} total loyalty members.`;
    }

    if (q.includes('90 days') || q.includes('not purchased')) {
      const now = Date.now();
      const inactive = customers.filter((c) => {
        if (!c.last_purchase_date) return c.status === 'At Risk' || c.status === 'Lost';
        const days = Math.floor((now - new Date(c.last_purchase_date).getTime()) / 86400000);
        return days > 90;
      });
      if (inactive.length === 0) return 'No customers have been inactive for more than 90 days. All customers have recent purchase activity.';
      return `${inactive.length} customers have not purchased in the last 90 days:\n\n${inactive.slice(0, 10).map((c, i) => `${i + 1}. ${c.name} — Last purchase: ${c.last_purchase_date ?? 'Unknown'} (${c.segment})`).join('\n')}`;
    }

    if (q.includes('platinum') && (q.includes('campaign') || q.includes('generate'))) {
      const platinum = customers.filter((c) => c.segment === 'Platinum' || c.segment === 'Champions');
      return `I recommend creating a campaign targeting your ${platinum.length} top-tier members. Suggested approach:\n\n- Channel: Email + WhatsApp\n- Subject: "Exclusive Rewards Just For You"\n- Offer: 20% discount + VIP event invitation\n- Tone: Premium and personalized\n- Use {{first_name}} and {{total_spend}} variables for personalization\n\nGo to Campaigns to create this campaign.`;
    }

    if (q.includes('retention') && q.includes('at-risk')) {
      const atRisk = customers.filter((c) => c.churn_risk === 'High');
      return `For your ${atRisk.length} at-risk customers, I recommend a win-back campaign:\n\n- Channel: SMS (higher open rates for urgent messages)\n- Message: "Hi {{first_name}}, we miss you! Here's a special 15% discount waiting for you."\n- Audience: Churn Risk = High\n- Follow up with Email after 3 days if no response\n\nGo to Campaigns to create this campaign.`;
    }

    if (q.includes('summar') || q.includes('performance') || q.includes('overview')) {
      const totalRev = customers.reduce((s, c) => s + Number(c.total_spent), 0);
      const active = customers.filter((c) => c.status === 'Active').length;
      const atRisk = customers.filter((c) => c.status === 'At Risk').length;
      const posSentiment = sentiments.filter((s) => s.sentiment_label === 'Positive').length;
      const sentPct = sentiments.length ? ((posSentiment / sentiments.length) * 100).toFixed(0) : 'N/A';
      const totalTxnRevenue = transactions.filter((t) => t.status === 'Completed').reduce((s, t) => s + Number(t.amount), 0);
      const avgOrderValue = transactions.length ? (totalTxnRevenue / transactions.length) : 0;
      return `Business Performance Summary:\n\n- Total Customers: ${customers.length} (${active} active, ${atRisk} at risk)\n- Total Revenue (customer spend): ${formatCurrency(totalRev)}\n- Transaction Revenue: ${formatCurrency(totalTxnRevenue)}\n- Total Transactions: ${transactions.length}\n- Avg Order Value: ${formatCurrency(avgOrderValue)}\n- Loyalty Members: ${loyalty.length}\n- Sentiment: ${sentPct}${sentiments.length ? '% positive' : ''}\n- Campaigns: ${campaigns.length}\n- Churn Predictions: ${churn.length} at-risk customers identified\n\nFocus on retaining the ${atRisk} at-risk customers to protect revenue.`;
    }

    if (q.includes('product') && (q.includes('sell') || q.includes('most') || q.includes('top'))) {
      if (transactions.length === 0) return 'No transaction data available. Upload a CSV with transaction-level data (amount, product, purchase_date) to analyze product sales.';
      const productRev: Record<string, number> = {};
      const productCount: Record<string, number> = {};
      transactions.forEach((t) => {
        if (t.status === 'Completed' && t.product_name) {
          productRev[t.product_name] = (productRev[t.product_name] ?? 0) + Number(t.amount);
          productCount[t.product_name] = (productCount[t.product_name] ?? 0) + 1;
        }
      });
      const sorted = Object.entries(productRev).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (sorted.length === 0) return 'No completed transactions with product names found in your data.';
      return `Based on your transaction data, here are the top-selling products by revenue:\n\n${sorted.map(([name, rev], i) => `${i + 1}. ${name} — ${formatCurrency(rev)} (${productCount[name]} orders)`).join('\n')}\n\nConsider bundling top products for upselling opportunities.`;
    }

    if (q.includes('total revenue') || q.includes('total revenue')) {
      const totalRev = customers.reduce((s, c) => s + Number(c.total_spent), 0);
      const txnRev = transactions.filter((t) => t.status === 'Completed').reduce((s, t) => s + Number(t.amount), 0);
      return `Total revenue from customer records: ${formatCurrency(totalRev)}\nTotal revenue from transactions: ${formatCurrency(txnRev)}\nTotal transactions: ${transactions.length}`;
    }

    return `I can help you with:\n- Customer churn risk and retention strategies\n- Revenue by segment\n- Top loyal customers\n- Campaign recommendations\n- Business performance summaries\n- Top-selling products (from transaction data)\n- Customers inactive for 90+ days\n- Gold tier customer count\n- AI-generated recommendations\n\nTry asking: "Who are my top customers?" or "Which products sell the most?"`;
  };

  const handleSend = (text?: string) => {
    const query = text ?? input;
    if (!query.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: query }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const response = generateResponse(query);
      setMessages((m) => [...m, { role: 'assistant', content: response }]);
      setThinking(false);
    }, 800);
  };

  return (
    <div>
      <PageHeader title="AI Assistant" subtitle="Ask questions about your business in natural language" />

      <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              }}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-brand-500 text-white' : ''}`} style={msg.role === 'assistant' ? { background: 'rgba(148,163,184,0.08)', color: 'var(--text-primary)' } : {}}>
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          <AnimatePresence>
            {thinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(148,163,184,0.08)' }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 pb-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => handleSend(s)} className="px-3 py-1.5 rounded-full text-xs border transition-colors hover:bg-brand-500/10 hover:border-brand-500/30" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Sparkles className="w-3 h-3 inline mr-1" /> {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your business..."
            className="input-field flex-1"
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || thinking} className="btn-primary px-4">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
