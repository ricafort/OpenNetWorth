# Developer Guide & Setup

Welcome team! This guide is for developers (Humans & AI) working on ClearWorth.
If you are new to coding or this project, start with **"The Basics"** below.

---

## 🛠️ Tech Stack Overview

If you are new to the project, here are the core technologies we use:

- **Frontend Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **State Management**: [TanStack Query](https://tanstack.com/query) (Server State)

## 🔄 Contribution Workflow

1.  **Fork** the repository.
2.  **Create a Branch** for your feature (`git checkout -b feature/amazing-feature`).
3.  **Commit** your changes (*please use descriptive commit messages*).
4.  **Push** to the branch (`git push origin feature/amazing-feature`).
5.  **Open a Pull Request** targeting the `main` branch.

---

---

## 🛠️ Quick Setup (Get Running Fast)

### Prerequisites
- Node.js 18+ (LTS recommended)
- Git installed
- Supabase account (Free tier is fine)
- Google Gemini API key (Free tier is fine)

### Installation
```bash
git clone https://github.com/ricafort/ClearWorth.git
cd ClearWorth
npm install
```

### Environment Configuration
Create a `.env.local` file in the root folder. You can copy the example below:
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
GEMINI_API_KEY="your-gemini-key"

# Optional (mocked if missing)
PLAID_CLIENT_ID="your-plaid-id"
```

### Database Setup (Fresh Install)
1. Go to your Supabase Dashboard -> SQL Editor.
2. Open `supabase_schema.sql` (in this repo).
3. Copy/Paste the code and click "Run".
4. Success! Your tables are created.

### Verify Installation
```bash
npm run dev        # Should start on port 4000
npm run build      # Should complete without errors
```

---

## 📚 Documentation Map
*   **Design System**: See [`components/ui`](src/components/ui) for reusable buttons/cards.
*   **Architecture**: See [`project_docs/architecture.md`](project_docs/architecture.md) for how data flows.
*   **Project Specs**: See [`project_docs/product.md`](project_docs/product.md).

---
*For AI Agents: Please refer to rules in `project_docs/agents.md`.*
