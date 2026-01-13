# darkzBOX

An open-source email automation platform built with Next.js. Create multi-step email campaigns, manage leads, view all replies in a unified inbox, and leverage AI-powered auto-responses. Think instantly.ai .. but free with an AI-powered auto-responder that matches your brand's voice.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-teal)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ Features

- **📧 Email Campaigns** - Multi-step email sequences with Spintax support for personalization
- **🔀 A/B Testing** - Test multiple email variants with configurable weights per step
- **📡 Sender** - One-time bulk email campaigns without follow-up sequences
- **👥 Lead Management** - Import leads, track status (pending, contacted, replied, bounced)
- **📬 Unibox** - Unified inbox showing all replies across campaigns
- **🤖 Reply Guy** - AI-powered auto-responses using Anthropic Claude
- **📊 Analytics Dashboard** - Track open rates, reply rates, and campaign performance
- **📨 Email Accounts** - Connect multiple SMTP/IMAP accounts with Google OAuth support
- **📝 Rich Text Editor** - Full WYSIWYG editor with HTML source toggle for all email composition
- **🚫 Blocklist** - Manage blocked domains and email addresses
- **📝 Templates** - Save and reuse email templates
- **⏰ Scheduling** - Set campaign sending windows by day/time

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma](https://www.prisma.io/) | Database ORM |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [BullMQ](https://docs.bullmq.io/) | Job queue for email scheduling |
| [Redis](https://redis.io/) | Queue backend |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Tiptap](https://tiptap.dev/) | Rich text editor |
| [NextAuth.js](https://next-auth.js.org/) | Authentication |
| [Nodemailer](https://nodemailer.com/) | Email sending |
| [Anthropic Claude](https://www.anthropic.com/) | AI auto-responses (Reply Guy) |

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Redis** 6+
- **Google Cloud Console** account (for OAuth)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/darkzBOX.git
cd darkzBOX
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#-environment-variables) section).

### 4. Start the database services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 5. Set up the database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5433/darkzbox?schema=public` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `NODE_ENV` | Environment mode | `development` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | From Google Cloud Console |
| `NEXTAUTH_SECRET` | NextAuth encryption key | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

## 🔧 Google OAuth Setup

To enable email sending via Gmail OAuth:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API** in APIs & Services > Library

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose "External" user type
3. Fill in the app information:
   - App name: `darkzBOX`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.send`
5. Add test users if in testing mode

### 3. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** to your `.env`

## 📁 Project Structure

```
darkzBOX/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── actions/           # Server actions (modular)
│   │   ├── blocklist.ts   # Blocklist actions
│   │   ├── leads.ts       # Lead management actions
│   │   └── sender.ts      # Sender actions
│   ├── actions.ts         # Main server actions
│   ├── app/               # Next.js App Router pages
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── api/           # API routes
│   │   ├── blocklist/     # Blocklist management
│   │   ├── campaigns/     # Campaign management
│   │   ├── leads/         # Lead management
│   │   ├── reply-guy/     # AI auto-response config
│   │   ├── sender/        # One-time email sender
│   │   ├── settings/      # Settings pages
│   │   └── unibox/        # Unified inbox
│   ├── components/        # React components
│   │   ├── RichTextEditor.tsx  # WYSIWYG editor with HTML toggle
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   └── ...
│   ├── lib/               # Utilities
│   │   ├── auth.ts        # NextAuth config
│   │   ├── email-engine.ts # Email sending
│   │   ├── prisma.ts      # Database client
│   │   └── spintax.ts     # Spintax parser
│   └── worker/            # Background jobs
│       ├── campaign-queue.ts
│       ├── imap-listener.ts
│       └── reply-guy-queue.ts
├── docker-compose.yml     # Docker services
└── package.json
```

## 📖 Usage

### Creating a Campaign

1. Navigate to **Campaigns** > **New Campaign**
2. Set campaign name and schedule
3. Add leads (email, first name, last name, company)
4. Create email steps with Spintax support:
   ```
   Hi {{firstName}},

   {I noticed|I saw|I found} your company {{companyName}}...
   ```
5. Launch the campaign

### A/B Testing

Test different email variations to optimize your campaigns:

1. When creating or editing a campaign step, toggle **Enable A/B Test**
2. Add multiple variants (A, B, C, etc.) with different subject lines and body content
3. Set weight percentages for each variant (must total 100%)
4. The system randomly selects a variant for each lead based on the weights
5. Track performance of each variant in the campaign analytics

### Managing Leads

- View all leads in the **Leads** section
- Filter by status: Pending, Contacted, Replied, Bounced
- Add individual leads or import in bulk

### AI Auto-Responses (Reply Guy)

1. Go to **Reply Guy** settings
2. Add your Anthropic API key
3. Configure business context and custom prompts
4. Enable auto-responses for incoming emails

### One-Time Sender

The **Sender** feature is for sending immediate, one-time email campaigns without follow-up sequences:

1. Navigate to **Sender** in the sidebar
2. Create email templates with personalization variables (`{{firstName}}`, `{{lastName}}`, `{{company}}`)
3. Create lead groups and upload CSV files with your contacts
4. Create a campaign by selecting a template and lead group
5. Start the campaign to send emails immediately

> **Note:** For multi-step email sequences with automated follow-ups, use the **Campaigns** feature instead.

### Managing the Blocklist

Block unwanted domains or email addresses from receiving your campaigns:

1. Go to **Blocklist** in the sidebar
2. Add domains (e.g., `competitor.com`) or specific emails
3. Blocked addresses are automatically excluded from all campaigns

### Rich Text Editor

All email composition areas include a full-featured rich text editor:

- **Formatting:** Bold, italic, underline, strikethrough
- **Lists:** Bullet and numbered lists with indentation
- **Alignment:** Left, center, right text alignment
- **Links:** Insert and edit hyperlinks
- **Variables:** Quick-insert personalization variables
- **HTML Mode:** Toggle to view/edit raw HTML source (click the `</>` icon)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [BullMQ](https://docs.bullmq.io/) - Premium Job Queue
- [Anthropic](https://www.anthropic.com/) - AI/ML APIs
