# BandhanAI — AI-Powered Customer Intelligence & CRM Platform

> **Transform customer data into actionable intelligence, personalized engagement, and measurable business growth.**

**BandhanAI** is an AI-powered Customer Relationship Management and customer intelligence platform designed to help businesses understand their customers, identify high-value segments, predict churn, analyze customer sentiment, and create personalized marketing campaigns from their own business data.

The platform combines **customer analytics, RFM segmentation, churn intelligence, sentiment analysis, campaign automation, AI-assisted insights, and multi-dataset management** into a unified SaaS experience.

---

## 🚀 Overview

Modern businesses generate large amounts of customer data but often struggle to convert that data into meaningful decisions.

BandhanAI addresses this gap by providing a complete workflow:

```text
Customer Data
      ↓
Dataset Upload & Mapping
      ↓
Customer Intelligence
      ↓
RFM Segmentation
      ↓
Churn Analysis
      ↓
Loyalty & Customer Value
      ↓
Sentiment Analysis
      ↓
AI-Powered Insights
      ↓
Personalized Campaigns
      ↓
Business Decisions
```

Instead of treating customer data as static records, BandhanAI transforms it into a **decision-support and engagement system**.

---

# ✨ Key Features

## 📊 Customer Intelligence Dashboard

A centralized analytics dashboard providing an overview of customer activity and business performance.

- Total customers
- Revenue and spending insights
- Order statistics
- Customer segments
- Churn indicators
- Loyalty metrics
- Sentiment distribution
- Campaign performance
- Dataset-specific analytics

---

## 📁 Multi-Dataset Management

BandhanAI supports multiple customer datasets while maintaining strict dataset isolation.

### Capabilities

- Upload multiple datasets
- CSV data import
- Column mapping
- Dataset switching
- Dataset-specific customer records
- Dataset-specific analytics
- Dataset deletion
- Dataset-aware campaigns and reports

Each dataset can be independently analyzed without contaminating data from another dataset.

---

## 👥 Customer Management

Manage and analyze individual customer profiles from a centralized CRM interface.

Customer information can include:

- Customer ID
- Name
- Email
- Phone
- Company
- Location
- Purchase history
- Revenue
- Number of orders
- Purchase dates
- Product information
- Category
- Ratings
- Reviews
- Customer segment
- Loyalty information

---

# 📈 RFM Customer Segmentation

BandhanAI uses **Recency, Frequency, and Monetary (RFM)** analysis to identify customer behavior and value.

### Recency

How recently a customer purchased.

### Frequency

How frequently a customer purchases.

### Monetary

How much revenue the customer generates.

Customers can then be categorized into meaningful business segments such as:

- Champions
- Loyal Customers
- Potential Loyalists
- New Customers
- At Risk
- Hibernating
- Lost Customers

This allows businesses to create targeted strategies instead of treating every customer equally.

---

# 🔮 Churn Intelligence

BandhanAI identifies customers who may be at risk of becoming inactive.

The platform analyzes customer behavior and generates churn-oriented insights that help businesses:

- Identify potentially lost customers
- Prioritize retention efforts
- Understand customer inactivity
- Create targeted retention campaigns
- Reduce customer attrition

> The churn module is designed as a decision-support layer and can be extended with production ML models as the platform evolves.

---

# ❤️ Loyalty Intelligence

Track customer engagement and loyalty using behavioral metrics.

Features include:

- Loyalty points
- Customer value
- Repeat purchase behavior
- Engagement indicators
- High-value customer identification
- Loyalty-oriented segmentation

Businesses can use these insights to design rewards and retention strategies.

---

# 💬 Sentiment Analysis

Analyze customer reviews and feedback to understand customer perception.

BandhanAI processes textual feedback to identify sentiment patterns such as:

- Positive
- Neutral
- Negative

This can help businesses discover:

- Customer satisfaction trends
- Negative feedback patterns
- Product issues
- Service problems
- Opportunities for improvement

---

# 🤖 AI-Powered Campaigns

Create personalized customer engagement campaigns directly from the CRM.

Supported communication channels include:

- 📧 Email
- 📱 SMS

Campaign workflows include:

```text
Select Dataset
      ↓
Select Audience
      ↓
Choose Channel
      ↓
Compose Message
      ↓
Personalize Content
      ↓
Review Recipients
      ↓
Send Campaign
      ↓
Track Results
```

Campaigns maintain recipient-level delivery information and provider responses.

---

# 📬 Email Automation

BandhanAI integrates with **Resend** for transactional and campaign email delivery.

The system supports:

- Recipient validation
- Personalized email content
- Campaign tracking
- Provider response handling
- Delivery status
- Failure reporting
- Provider message IDs
- Campaign history

---

# 📱 SMS Automation

BandhanAI integrates with **Twilio** for SMS communication.

The communication layer includes:

- Phone number validation
- E.164 normalization
- Recipient validation
- Provider response validation
- Delivery status handling
- Failure tracking
- Twilio provider IDs
- Error reporting

> SMS availability depends on Twilio account configuration, regional restrictions, and messaging policies.

---

# 🧠 AI Assistant

BandhanAI includes an AI-assisted interface designed to help users interpret customer data and generate actionable business insights.

Example questions:

```text
Which customers are at high risk of churn?

Who are my highest-value customers?

Which customer segment generates the most revenue?

Which customers should receive a retention campaign?

What are the major negative sentiment patterns?

Which customers have not purchased recently?
```

The assistant is designed to transform analytical results into business-oriented recommendations.

---

# 📑 Reports & Analytics

Generate structured insights from customer datasets.

Reports can include:

- Customer statistics
- Revenue analysis
- Segment distribution
- Churn insights
- Loyalty analysis
- Sentiment trends
- Campaign performance
- Dataset-specific metrics

---

# 🔐 Authentication & Data Isolation

BandhanAI uses **Supabase Authentication** and database-level access control.

The architecture is designed around:

```text
User
  │
  ├── Datasets
  │      │
  │      ├── Customers
  │      ├── Transactions
  │      ├── Segments
  │      ├── Campaigns
  │      └── Analytics
  │
  └── User-specific resources
```

User-owned records are associated with the authenticated user, while dataset-dependent records are associated with the relevant dataset.

This enables secure multi-dataset workflows and prevents cross-dataset contamination.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      BandhanAI       │
                    │      Web Client      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + TypeScript │
                    │      Vite Frontend   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Supabase       │
                    │                      │
                    │  Authentication      │
                    │  PostgreSQL          │
                    │  Row Level Security  │
                    │  Edge Functions      │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
          ┌───────────┐ ┌───────────┐ ┌─────────────┐
          │  Resend   │ │  Twilio   │ │ AI / Logic  │
          │   Email   │ │    SMS    │ │   Layer     │
          └───────────┘ └───────────┘ └─────────────┘
```

---

# 🛠️ Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Framer Motion
- Recharts
- Lucide React

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)
- Supabase Edge Functions

### Communication

- Resend
- Twilio

### Data & Analytics

- CSV processing
- RFM analysis
- Customer segmentation
- Churn analysis
- Sentiment analysis
- Behavioral analytics

### Deployment

- Vercel
- Supabase

---

# 📂 Project Structure

```text
Bandhan-AI/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── App.tsx
│
├── supabase/
│   ├── functions/
│   │   └── send-campaign/
│   │       └── index.ts
│   └── migrations/
│
├── .env
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

# 🔄 Data Pipeline

BandhanAI follows a structured customer-data pipeline:

```text
CSV Upload
    ↓
Schema / Column Mapping
    ↓
Data Validation
    ↓
Customer Import
    ↓
Transaction Processing
    ↓
Derived Metrics
    ↓
RFM Analysis
    ↓
Customer Segmentation
    ↓
Churn Intelligence
    ↓
Sentiment Analysis
    ↓
Campaign Audience
    ↓
Personalized Engagement
```

---

# 📋 Supported Dataset Fields

BandhanAI can work with customer datasets containing fields such as:

| Field | Description |
|---|---|
| Customer ID | Unique customer identifier |
| Customer Name | Customer name |
| Email | Customer email |
| Phone | Customer phone number |
| Company | Customer/company name |
| Location | Customer location |
| Purchase Amount | Transaction value |
| Purchase Date | Transaction date |
| Product | Purchased product |
| Category | Product category |
| Rating | Customer rating |
| Review | Customer feedback |
| Status | Customer/transaction status |

Additional business metrics such as revenue, order count, recency, segments, and loyalty scores can be derived from transactional data.

---

# ⚙️ Local Development

## 1. Clone the repository

```bash
git clone https://github.com/varsha517/Bandhan-AI-.git
cd Bandhan-AI-
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

> Never commit private API keys, service-role keys, Resend keys, or Twilio credentials to GitHub.

## 4. Start development server

```bash
npm run dev
```

The application will be available through the local Vite development server.

## 5. Production build

```bash
npm run build
```

---

# 🔑 Environment & Secrets

### Frontend

The frontend requires:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Supabase Edge Functions

Provider credentials should remain server-side:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL

TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

These secrets should be configured through Supabase Edge Function secrets rather than exposed in frontend code.

---

# 🚀 Deployment

BandhanAI uses a split deployment architecture:

```text
                    GitHub
                       │
                       ▼
                    Vercel
                       │
                       │ Frontend
                       ▼
                  BandhanAI UI
                       │
                       ▼
                   Supabase
                 ┌─────┴─────┐
                 │           │
             PostgreSQL    Edge Functions
                 │           │
                 │      ┌────┴────┐
                 │      │         │
                 ▼      ▼         ▼
              Customer Resend   Twilio
                Data
```

### Frontend

Deploy the React/Vite application through Vercel.

### Backend

Supabase manages:

- PostgreSQL
- Authentication
- Row Level Security
- Edge Functions
- Server-side provider integrations

---

# 🧪 Quality & Validation

The project is developed with a focus on:

- TypeScript type safety
- Production builds
- Dataset isolation
- Authentication
- Database persistence
- Provider response validation
- Campaign status tracking
- Error handling
- Secure secret management

Before deployment:

```bash
npm run typecheck
npm run build
```

---

# 🔒 Security Principles

BandhanAI follows several security practices:

- Authentication through Supabase
- Row Level Security for user-owned data
- Dataset-level data isolation
- Server-side provider credentials
- No service-role keys in frontend environment variables
- Provider response validation
- Recipient validation
- Error tracking for failed communications

---

# 🎯 Target Users

BandhanAI is designed for:

- Small and medium-sized businesses
- E-commerce businesses
- Retail businesses
- Marketing teams
- Customer success teams
- Sales teams
- Startup founders
- Business analysts
- CRM teams

---

# 💡 Example Business Use Case

A business uploads its customer transaction dataset.

BandhanAI automatically helps the business answer:

> **Who are my best customers?**

> **Who is likely to churn?**

> **Which customers haven't purchased recently?**

> **Which customers are highly loyal?**

> **What are customers saying about my products?**

> **Who should receive a retention campaign?**

The business can then move from **analysis → decision → action** within the same platform.

---

# 🗺️ Roadmap

### Current

- [x] Authentication
- [x] Customer management
- [x] Dataset upload
- [x] Dataset switching
- [x] RFM segmentation
- [x] Churn intelligence
- [x] Loyalty analytics
- [x] Sentiment analysis
- [x] AI-assisted insights
- [x] Email campaigns
- [x] SMS campaign architecture
- [x] Campaign history
- [x] Reports
- [x] Supabase backend
- [x] Vercel deployment

### Future Enhancements

- [ ] Production-grade ML churn models
- [ ] Advanced predictive customer lifetime value
- [ ] Automated campaign recommendations
- [ ] WhatsApp Business integration
- [ ] Advanced LLM-powered analytics
- [ ] Natural-language database querying
- [ ] Automated customer journey orchestration
- [ ] Real-time analytics
- [ ] Advanced cohort analysis
- [ ] Enterprise multi-tenant architecture
- [ ] Advanced model monitoring
- [ ] Recommendation engine

---

# 🌟 Why BandhanAI?

Traditional CRM systems primarily store customer information.

BandhanAI focuses on **customer intelligence**.

```text
Traditional CRM
      ↓
Store Customer Data

BandhanAI
      ↓
Understand Customer Data
      ↓
Predict Customer Behavior
      ↓
Identify Business Opportunities
      ↓
Take Action
      ↓
Measure Results
```

The objective is to move CRM from a **record-keeping system** toward an **intelligent decision-support platform**.

---

# 📊 Project Vision

> **BandhanAI aims to bridge the gap between raw customer data, artificial intelligence, and real-world business action.**

By combining customer analytics, behavioral intelligence, segmentation, predictive insights, sentiment analysis, and automated communication, BandhanAI provides businesses with a unified platform for understanding and engaging their customers.

---

# 👩‍💻 Project

**BandhanAI — AI-Powered Customer Intelligence & CRM Platform**

Developed as an AI/ML and full-stack SaaS project.

**Author:** S. Varsha

**GitHub:** `varsha517`

---

# 📄 License

This project is developed for educational, research, portfolio, and demonstration purposes.

Add an appropriate open-source license before distributing the project publicly.
