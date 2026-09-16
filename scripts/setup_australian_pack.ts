import Database from 'better-sqlite3';
import path from 'path';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';

const TEST_VAULT_PATH = path.resolve(process.cwd(), 'data', 'test_browser_vault.sqlite');
const db = new Database(TEST_VAULT_PATH);

try {
    // 1. Household Entity and Account
    const household = createEntity(db, {
        name: 'Household',
        type: 'household',
        currency: 'AUD'
    });

    createAccount(db, {
        entity_id: household.id,
        name: 'Everyday Checking',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        opening_balance_cents: 100000,
        opening_date: '2025-06-30'
    });

    // 2. Company Entity and Account
    const company = createEntity(db, {
        name: 'Company',
        type: 'business',
        currency: 'AUD'
    });

    createAccount(db, {
        entity_id: company.id,
        name: 'Business Operating',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        opening_balance_cents: 50000,
        opening_date: '2025-06-30'
    });

    console.log("Successfully created Household and Company entities and accounts for the Australian Test Pack.");
} catch (err) {
    console.error("Error setting up test pack entities:", err);
} finally {
    db.close();
}
