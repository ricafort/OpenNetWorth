import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../infrastructure/sqlite/db';
import { ingestCsvDocument, approveProposals, updateProposalReview } from './documentInboxService';
import { CsvMappingProfile } from './types';
import crypto from 'crypto';

describe('Batch C3: Categorization Rules Acceptance', () => {
    let db: Database.Database;

    const setupDatabase = () => {
        db = createTestDb();

        // Setup base entities and accounts
        const ownerId = `ent-${crypto.randomUUID()}`;
        db.prepare(`
            INSERT INTO entities (id, name, type, created_at, updated_at) VALUES (?, 'Test Owner', 'person', datetime('now'), datetime('now'))
        `).run(ownerId);

        const accountId = `acc-${crypto.randomUUID()}`;
        db.prepare(`
            INSERT INTO accounts (id, entity_id, name, type, sub_type, currency, created_at, updated_at)
            VALUES (?, ?, 'Checking', 'asset', 'checking', 'USD', datetime('now'), datetime('now'))
        `).run(accountId, ownerId);

        return { ownerId, accountId };
    };

    const mapping: CsvMappingProfile = {
        id: 'test-map',
        name: 'Test',
        header_signature: 'date,desc,amt',
        date_column: 'date',
        date_format: 'YYYY-MM-DD',
        description_column: 'desc',
        amount_mode: 'single_amount',
        amount_column: 'amt',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    beforeEach(() => {
        // Run any needed resets
    });

    it('should remember deliberate categorization choices across multiple imports', () => {
        const { accountId, ownerId } = setupDatabase();

        // 1. Import Month 1
        const csv1 = `date,desc,amt\n2026-01-01,Starbucks Seattle, -5.50\n2026-01-15,Acme Corp Salary, 2000.00`;
        const res1 = ingestCsvDocument(db, {
            filename: 'month1.csv',
            raw_content: csv1,
            mapping,
            target_account_id: accountId,
            default_category: 'living_expense'
        });

        expect(res1.proposals.length).toBe(2);
        
        // Initial defaults
        const starbucksProp1 = res1.proposals.find(p => p.description.includes('Starbucks'))!;
        expect(starbucksProp1.suggested_category).toBe('living_expense'); // Default fallback

        // 2. User edits and checks "Save categorization rule"
        updateProposalReview(db, {
            proposal_id: starbucksProp1.id,
            suggested_category: 'entertainment',
            save_categorization_rule: true
        });

        // Check if rule was saved
        const rules = db.prepare('SELECT * FROM categorization_rules').all() as any[];
        expect(rules.length).toBe(1);
        expect(rules[0].target_category).toBe('entertainment');
        expect(rules[0].match_string).toBe('starbucks seattle');

        // Approve it to lock it in
        approveProposals(db, {
            document_id: res1.document.id,
            target_account_id: accountId,
            entity_id: ownerId,
            items: [
                {
                    proposal_id: starbucksProp1.id,
                    category: 'entertainment'
                }
            ]
        });

        // 3. Import Month 2
        const csv2 = `date,desc,amt\n2026-02-01,Starbucks Seattle, -6.50\n2026-02-15,Acme Corp Salary, 2000.00`;
        const res2 = ingestCsvDocument(db, {
            filename: 'month2.csv',
            raw_content: csv2,
            mapping,
            target_account_id: accountId,
            default_category: 'living_expense'
        });

        // The rule should automatically apply 'entertainment' to the new Starbucks proposal
        const starbucksProp2 = res2.proposals.find(p => p.description.includes('Starbucks'))!;
        expect(starbucksProp2.suggested_category).toBe('entertainment');

        const salaryProp2 = res2.proposals.find(p => p.description.includes('Acme'))!;
        expect(salaryProp2.suggested_category).toBe('living_expense'); // Uses default category
    });

    it('should explicitly honour exact matching and not broaden silently', () => {
        const { accountId, ownerId } = setupDatabase();

        // Save a rule manually
        db.prepare(`
            INSERT INTO categorization_rules (id, account_id, match_string, match_type, target_category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run('rule-1', accountId, 'shell', 'exact', 'transportation');

        // Import CSV
        const csv = `date,desc,amt\n2026-01-01,Shell, -5.50\n2026-01-02, SHELL , -10.00\n2026-01-03,Seashell Cafe, -15.00\n2026-01-04,Shell Service Station, -20.00`;
        const res = ingestCsvDocument(db, {
            filename: 'gas.csv',
            raw_content: csv,
            mapping,
            target_account_id: accountId,
            default_category: 'living_expense'
        });

        const proposals = res.proposals;
        
        // "Shell" -> Exact match
        expect(proposals.find(p => p.description === 'Shell')!.suggested_category).toBe('transportation');
        // " SHELL " -> Exact match (normalized/trimmed/lowercased)
        // Note: The CSV parser may trim descriptions, so we look for 'SHELL' in the parsed output,
        // but it still proves the exact matching handles the capitalization correctly.
        expect(proposals.find(p => p.description === 'SHELL')!.suggested_category).toBe('transportation');
        // "Seashell Cafe" -> Not an exact match
        expect(proposals.find(p => p.description === 'Seashell Cafe')!.suggested_category).toBe('living_expense');
        // "Shell Service Station" -> Not an exact match
        expect(proposals.find(p => p.description === 'Shell Service Station')!.suggested_category).toBe('living_expense');
    });

    it('should update existing rule without creating duplicates when save_categorization_rule is true', () => {
        const { accountId, ownerId } = setupDatabase();

        db.prepare(`
            INSERT INTO categorization_rules (id, account_id, match_string, match_type, target_category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run('rule-1', accountId, 'starbucks seattle', 'exact', 'entertainment');

        // Import
        const csv1 = `date,desc,amt\n2026-01-01,Starbucks Seattle, -5.50`;
        const res1 = ingestCsvDocument(db, {
            filename: 'month1.csv',
            raw_content: csv1,
            mapping,
            target_account_id: accountId,
            default_category: 'living_expense'
        });

        // User updates it to living_expense
        updateProposalReview(db, {
            proposal_id: res1.proposals[0].id,
            suggested_category: 'living_expense',
            save_categorization_rule: true
        });

        // Check if rule was updated instead of duplicated
        const rules = db.prepare('SELECT * FROM categorization_rules').all() as any[];
        expect(rules.length).toBe(1);
        expect(rules[0].target_category).toBe('living_expense');
    });
});
