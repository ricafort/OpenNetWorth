# Contributor & Developer Setup Guide

Welcome to the **OpenNetWorth** contributor community! This guide is for developers (Humans & AI Agents) working on OpenNetWorth.

---

## 🛠️ Tech Stack Overview

- **Frontend Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Local Database**: [SQLite](https://sqlite.org/) via `better-sqlite3` (`data/opennetworth.sqlite`)
- **AI Mentorship**: Local LLMs via [LM Studio](https://lmstudio.ai/) (`:1234`) or [Ollama](https://ollama.ai/) (`:11434`)
- **State Management**: React Hooks & Context + [TanStack Query](https://tanstack.com/query)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🔄 Contribution Workflow

1. **Fork** the repository: [https://github.com/ricafort/OpenNetWorth](https://github.com/ricafort/OpenNetWorth).
2. **Create a Branch** for your feature (`git checkout -b feature/amazing-feature`).
3. **Commit** your changes (*please include comments explaining why code exists and descriptive commit messages*).
4. **Push** to the branch (`git push origin feature/amazing-feature`).
5. **Open a Pull Request** targeting the `main` branch.

---

## 🛠️ Quick Setup (Zero Friction)

### Prerequisites
- Node.js 18+ (LTS recommended)
- Git installed
- *(Optional)* [LM Studio](https://lmstudio.ai/) on port 1234 or [Ollama](https://ollama.ai/) on port 11434 for local AI mentorship

### Installation
```bash
git clone https://github.com/ricafort/OpenNetWorth.git
cd OpenNetWorth
npm install
```

### Database Setup
**Zero manual setup needed!**
OpenNetWorth automatically initializes the local embedded SQLite database at `data/opennetworth.sqlite` and creates all required tables on first startup.

### Environment Configuration (Optional)
OpenNetWorth runs out-of-the-box with **ZERO mandatory environment variables**.
If you wish to customize your local LLM model endpoints:
```bash
cp .env.example .env.local
```

### Run Locally
```bash
npm run dev        # Starts on port 4000
npm test -- --run  # Runs the Vitest test suite
```

### Verify Installation
```bash
npm run dev        # Starts on http://localhost:4000
npm test -- --run  # Should pass all test suites
```

---

## 📚 Documentation Map
* **Architecture**: See [`project_docs/architecture.md`](project_docs/architecture.md) for how data flows.
* **Tech Stack**: See [`project_docs/techStack.md`](project_docs/techStack.md) for libraries and engineering rules.
* **Specifications**: See [`project_docs/specifications.md`](project_docs/specifications.md) for feature specifications.
* **Deployment**: See [`project_docs/deployment.md`](project_docs/deployment.md) for local and self-hosting guides.
* **Agent Guidelines**: See [`project_docs/agents.md`](project_docs/agents.md) for AI pairing rules.
