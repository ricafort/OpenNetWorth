/**
 * Builds the read-only demo vaults served in demo mode (Phase 2.7).
 *
 * Why this exists:
 * Demo personas used to be written into the user's own localStorage (and,
 * worse, into the live vault shape) by `demoMode.ts`. Now each persona is a
 * separate, fully-migrated SQLite file under `data/demo_vaults/<id>.sqlite`
 * that API routes open READ-ONLY when the `demo_persona` cookie is set. The
 * live vault can never be polluted by demo data.
 *
 * Run:  npx tsx scripts/seed-demo-vaults.ts   (or: npm run seed:demo)
 *
 * Guarantees:
 * - Each file runs the COMPLETE migration list (same schema as the live vault).
 * - Personas are synthetic (demoConfigs.ts) — no real financial data.
 * - `data/` is gitignored, so these fixtures can never be committed.
 * - Files are closed with journal_mode=DELETE so the read-only connections
 *   (better-sqlite3 `readonly: true`) never need WAL sidecar files.
 * - Deterministic: a seeded PRNG keyed by persona id keeps history/cash-flow
 *   variety stable across re-seeds.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/infrastructure/sqlite/migrations';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';
import {
    GETTING_STARTED_CONFIG,
    STABILIZING_CONFIG,
    BUILDING_FOUNDATIONS_CONFIG,
    FAMILY_CONFIG,
    GROWING_WEALTH_CONFIG,
} from '../src/features/demo/demoConfigs';
import type { ProfileConfig } from '../src/features/demo/demoFactory';
import type { AccountSubType } from '../src/lib/domain/accounting/types';
import { SAMPLE_FREEDOM_SETTINGS } from '../src/infrastructure/sampleData';

// Same env override db.ts's demoVaultDir() honors, so tests can point both the
// seeder and the API routes at one temp directory. Resolved at call time.
function demoVaultDir(): string {
    return process.env.OPENNETWORTH_DEMO_DIR
        ? path.resolve(process.env.OPENNETWORTH_DEMO_DIR)
        : path.resolve('data', 'demo_vaults');
}

export const PERSONAS: ProfileConfig[] = [
    GETTING_STARTED_CONFIG,
    STABILIZING_CONFIG,
    BUILDING_FOUNDATIONS_CONFIG,
    FAMILY_CONFIG,
    GROWING_WEALTH_CONFIG,
];

/** Deterministic PRNG (mulberry32) seeded from the persona id. */
function makeRng(seedText: string): () => number {
    let h = 0;
    for (let i = 0; i < seedText.length; i++) {
        h = (Math.imul(31, h) + seedText.charCodeAt(i)) | 0;
    }
    let a = h >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Mirrors the widget mappings in features/assets|liabilities/data/repository.ts
// so the ledger rows render with the same persona types as before.
function assetTypeToSubType(type: string): AccountSubType {
    switch (type) {
        case 'cash': return 'cash';
        case 'investment': return 'investment';
        case 'crypto': return 'crypto';
        case 'real_estate': return 'property';
        case 'retirement': return 'retirement';
        case 'vehicle': return 'vehicle';
        default: return 'other';
    }
}

function liabilityTypeToSubType(type: string): AccountSubType {
    switch (type) {
        case 'mortgage': return 'mortgage';
        case 'auto_loan': return 'auto_loan';
        case 'credit_card': return 'credit_card';
        // m1 has no student_loan sub_type; personal_loan is the closest fit.
        case 'student_loan': return 'personal_loan';
        default: return 'other';
    }
}

function isoDay(d: Date): string {
    return d.toISOString().split('T')[0];
}

export function seedPersona(cfg: ProfileConfig): void {
    const dbPath = path.join(demoVaultDir(), `${cfg.id}.sqlite`);
    for (const suffix of ['', '-wal', '-shm']) {
        const p = dbPath + suffix;
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    // Full migration list — identical schema to the live vault (0001 seeds local_user).
    runMigrations(db);

    const rng = makeRng(cfg.id);
    const now = new Date();
    const nowIso = now.toISOString();
    const openingDate = isoDay(new Date(now.getFullYear() - 1, now.getMonth(), 1));

    // One household entity per persona; the ledger read path lists accounts across
    // all entities, so a single entity keeps the demo view unambiguous.
    const household = createEntity(db, { name: cfg.label, type: 'household', currency: 'USD' });

    for (let i = 0; i < cfg.assets.length; i++) {
        const a = cfg.assets[i];
        createAccount(db, {
            id: `${cfg.id}-a-${i}`,
            entity_id: household.id,
            name: a.name,
            type: 'asset',
            sub_type: assetTypeToSubType(a.type),
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: Math.round(a.value * 100),
            opening_date: openingDate
        });
    }

    for (let i = 0; i < cfg.liabilities.length; i++) {
        const l = cfg.liabilities[i];
        createAccount(db, {
            id: `${cfg.id}-l-${i}`,
            entity_id: household.id,
            name: l.name,
            type: 'liability',
            sub_type: liabilityTypeToSubType(l.type),
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: Math.round(l.balance * 100),
            opening_date: openingDate
        });
    }

    // Planning metadata stays in the plain tables the vault API already serves.
    const insertGoal = db.prepare(`
        INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
        VALUES (?, 'local_user', ?, ?, ?, ?, 'USD', ?, ?, ?)
    `);
    const goalDeadline = new Date(now.getFullYear() + 1, now.getMonth(), 1);
    (cfg.goals || []).forEach((g, i) => {
        insertGoal.run(
            `${cfg.id}-g-${i}`, g.name, g.target, g.current,
            Math.round(g.current * 0.5), g.category, isoDay(goalDeadline), nowIso
        );
    });

    const insertRecurring = db.prepare(`
        INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
        VALUES (?, 'local_user', ?, ?, ?, 'monthly', ?, '2024-01-01', NULL, 1, 'USD', ?)
    `);
    insertRecurring.run(`${cfg.id}-r-inc`, 'Primary Income', cfg.income, 'income', 'Salary', nowIso);
    insertRecurring.run(`${cfg.id}-r-exp`, 'Living Expenses', cfg.expenses, 'expense', 'General', nowIso);

    // 24 months of net-worth snapshots ending exactly at the persona's current
    // totals (the chart's last point must match the live ledger total).
    const totalAssets = cfg.assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = cfg.liabilities.reduce((s, l) => s + l.balance, 0);
    const insertSnapshot = db.prepare(`
        INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
        VALUES (?, 'local_user', ?, ?, ?, ?, 'USD')
    `);
    let curAssets = totalAssets;
    let curLiabilities = totalLiabilities;
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        insertSnapshot.run(
            `${cfg.id}-h-${i}`, isoDay(d),
            Math.round(curAssets), Math.round(curLiabilities),
            Math.round(curAssets - curLiabilities)
        );
        // Older months: assets were smaller, debts were larger (reverse growth).
        curAssets = curAssets / (1 + (0.005 + rng() * 0.005));
        curLiabilities = curLiabilities + (500 + rng() * 200);
    }

    // 12 months of cash-flow summaries with mild deterministic variety.
    const insertCashFlow = db.prepare(`
        INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
        VALUES (?, 'local_user', ?, ?, ?, 'USD')
    `);
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        const income = Math.round(cfg.income + (rng() * 200 - 100));
        const expenses = Math.round(cfg.expenses + (rng() * 400 - 100));
        insertCashFlow.run(`${cfg.id}-cf-${i}`, monthStr, income, expenses);
    }

    // UI state the settings kv route serves in demo mode.
    const upsertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    upsertSetting.run('userSettings', JSON.stringify({
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly',
        lastCheckIn: nowIso
    }));
    upsertSetting.run('freedomSettings', JSON.stringify(SAMPLE_FREEDOM_SETTINGS));

    // Single-file layout so read-only connections need no WAL sidecars.
    db.pragma('journal_mode = DELETE');
    db.close();

    console.log(
        `Seeded demo vault data/demo_vaults/${cfg.id}.sqlite — ` +
        `${cfg.assets.length} asset accounts, ${cfg.liabilities.length} liability accounts, ` +
        `${(cfg.goals || []).length} goals, 24 snapshots, 12 cash-flow months`
    );
}

export function seedAllPersonas(): void {
    const dir = demoVaultDir();
    fs.mkdirSync(dir, { recursive: true });
    for (const cfg of PERSONAS) {
        seedPersona(cfg);
    }
    console.log(`Done. ${PERSONAS.length} demo vaults in ${dir}`);
}

// CLI-only: importing this module from tests must not seed anything.
// (typeof guard: vitest's SSR transform may not define require/module.)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    seedAllPersonas();
}
