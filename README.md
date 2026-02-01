# ClearWorth

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**Your Financial "Control Room".**

ClearWorth is a personal finance dashboard that doesn't just track your money—it helps you strategize. Imagine a GPS for your wealth: you input where you are (Assets & Debts), and it calculates the fastest route to Financial Freedom.

![ClearWorth Dashboard](public/dashboard-preview.png)

## 🌟 Why ClearWorth?

Unlike complex spreadsheets or expensive advisors, ClearWorth is:
1.  **Friendly**: Designed like a game, not a tax form.
2.  **Private**: Your data stays in your browser (Demo Mode) or your own database.
3.  **Smart**: Built-in AI Mentors analyze your portfolio and give plain-English advice.

---

## 🚀 Key Features

### 📊 **Comprehensive Dashboard**
A modular, grid-based interface for visualizing financial health.
*   **Net Worth Engine**: Real-time aggregation of Assets minus Liabilities.
*   **Wealth Momentum**: Calculates the velocity of wealth accumulation based on monthly cash flow.
*   **Growth Tracking**: Visualizes portfolio performance, asset allocation, and dividend projections.

### 🧠 **AI Mentorship ("Wisdom")**
Integrated LLM support (Google Gemini) for contextual financial advice.
*   **Multi-Persona Interaction**: Chat with distinct archetypes (e.g., "Risk Guardian" for safety, "Tycoon" for growth).
*   **RAG-like Context**: The AI automatically receives a summarized snapshot of the user's financial state to provide relevant answers.

### 🎮 **Gamification System**
Behavioral reinforcement for positive financial habits.
*   **Badge System**: Database-triggered achievements (e.g., "Debt Destroyer" when liabilities decrease).
*   **Progression**: leveling system based on data completeness and financial milestones.

### ⏳ **Time Machine**
Historical data visualization and state reconstruction.
*   **Snapshots**: System automatically archives financial state on significant changes.
*   **State Travel**: Users can view the dashboard as it appeared on any previous date.
*   **Visual Cues**: UI applies specific filters (sepia/grayscale) to indicate historical view mode.

### 🛡️ **Privacy & Security**
*   **Stealth Mode**: A CSS-based theme that obscures sensitive values (matching background color) for public usage.
*   **Row-Level Security (RLS)**: Strict database policies ensure users can only query their own records.
*   **Blur Toggle**: One-click value obfuscation for screen sharing or demos.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+
*   Supabase Account (Free Tier is sufficient)
*   Google Gemini API Key (Free Tier is sufficient)

### 1. Clone & Install
```bash
git clone https://github.com/ricafort/ClearWorth.git
cd ClearWorth
npm install
```

### 2. Configure Environment
Create a `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL="your-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
GEMINI_API_KEY="your-ai-key"
```

### 3. Run Application
```bash
npm run dev
```
Access at `http://localhost:4000`.

*(See [CONTRIBUTING.md](CONTRIBUTING.md) for full database migration steps)*

---

## 📚 Documentation Links
*   [📖 Architecture Guide](project_docs/architecture.md): How the pieces fit together.
*   [📂 Project Structure](project_docs/project_structure.md): Where to find specific files.
*   [🤝 Contributing Guide](CONTRIBUTING.md): How to help us build this.

## 📄 License
MIT License. You can use this code for free, modify it, and share it.
