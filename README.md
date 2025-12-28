# ClearWorth

ClearWorth is a personal net worth tracking application designed to help you visualize your financial health, plan for freedom, and gain insights through AI-powered mentorship. It combines professional-grade dashboards with gamified elements and privacy-focused architecture.

![ClearWorth Dashboard](public/dashboard-preview.png)

## 🚀 Key Features

### 📊 **Comprehensive Dashboard**
*   **Net Worth Tracking**: Real-time calculation of Assets - Liabilities.
*   **Interactive Widgets**: Drag-and-drop grid layout to customize your view.
*   **Visualizations**: Asset Allocation pie charts and Net Worth history graphs.
*   **Wealth Momentum**: Gauge your financial velocity and progress.

### 🧠 **AI Mentorship ("Wisdom")**
*   **Multi-Persona AI**: Consult with distinct AI personalities like generic "Long-Term Thinker," "Risk Guardian," and more.
*   **Context-Aware Advice**: Mentors analyze your current financial data to provide tailored insights.
*   **Chat Interface**: Ask specific questions or get general financial wisdom.

### ⏳ **Time Machine**
*   **Historical Snapshots**: Travel back in time to view your financial state at any previous date.
*   **Vintage UI**: A unique visual overlay distinguishes historical views from the present.
*   **Trend Analysis**: Compare past performance with current standing.

### 🔓 **Financial Freedom Tools**
*   **Debt Payoff Calculator**: Strategize your debt exit with Snowball vs. Avalanche methods.
*   **Payoff Visuals**: Interactive charts showing interest savings and payoff dates.

### 🛡️ **Privacy & Security**
*   **Privacy Mode**: One-click "Blur Values" feature for using the app in public spaces or sharing screenshots.
*   **Data Ownership**: Full control over your data with export and delete capabilities.
*   **Row-Level Security**: Built on Supabase RLS to ensure data isolation.

### 🎮 **Gamification**
*   **Achievement Badges**: Unlock badges for financial milestones (e.g., "Positive Net Worth," "Debt Free").
*   **Onboarding Tour**: Interactive guide for new users.

## 🛠️ Technical Specifications

*   **Frontend**: Next.js 16 (App Router), React 19
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS, PostCSS
*   **Database & Auth**: Supabase (PostgreSQL)
*   **AI Integration**: Google Gemini API (`@google/generative-ai`)
*   **State Management**: React Hooks & Context API
*   **Charts**: Recharts
*   **Icons**: Lucide React
*   **Utilities**: `react-grid-layout` (Dashboard), `jspdf` (Export), `react-joyride` (Tour)

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+ installed.
*   A [Supabase](https://supabase.com/) account.
*   A [Google Gemini API Key](https://ai.google.dev/).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ricafort/ClearWorth.git
    cd ClearWorth
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    GEMINI_API_KEY=your_google_gemini_api_key
    ```

4.  **Setup Database**:
    *   Log in to your Supabase dashboard.
    *   Go to the **SQL Editor**.
    *   Copy the contents of `supabase_schema.sql` from this repository.
    *   Run the script to create the necessary tables and policies.

5.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:4000](http://localhost:4000) (or the port shown in your terminal) to view the app.

## 📖 Usage Guide

*   **Adding Data**: Use the (+) buttons in Assets or Liabilities sections to add items.
*   **Customizing Dashboard**: Click the "Customize" button to drag, resize, or hide widgets.
*   **Consulting AI**: Click the "Get Insights" button or access the Mentors page to start a chat.
*   **Privacy Mode**: Toggle the "Eye" icon in the top navigation to blur all financial figures.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

## 📄 License

This project is licensed under the MIT License.
