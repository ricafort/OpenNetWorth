
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Construct connection string
// Supabase connection string format: postgres://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres
// OR use the DATABASE_URL from env if available.
// If .env.local only has API keys, we might be stuck.
// Checking .env.local content via 'view_file' is forbidden (secrets).
// BUT standard Supabase projects have DATABASE_URL in .env usually?
// Typically NEXT.js projects with Supabase use the API, not direct DB connection.
// But wait, the user provided '00_init_full.sql', implying they might have run it somehow.

// Let's TRY to read process.env.DATABASE_URL.
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
    console.error("CRITICAL: No DATABASE_URL or POSTGRES_URL found in .env.local.");
    console.error("Cannot run DDL via 'pg' client without direct database connection.");
    console.error("Please run the SQL manually in the Supabase Dashboard.");
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Supabase usually
});

async function runMigration() {
    try {
        await client.connect();
        console.log("Connected to Database. Reading migration file...");

        const sqlPath = path.resolve(process.cwd(), 'supabase_migrations/13_gamification_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL...");
        await client.query(sql);
        console.log("Migration applied successfully!");

    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
