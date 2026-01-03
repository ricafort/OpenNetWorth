
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Try to find a connection string
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    console.error("❌ No DATABASE_URL found in .env.local. Cannot run migration directly.");
    console.error("Please run the SQL in 'supabase_migrations/09_allow_public_template_read.sql' manually in your Supabase SQL Editor.");
    process.exit(1);
}

async function runhelper() {
    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();

        console.log("🔌 Connected to Database.");

        const migrationPath = path.resolve(process.cwd(), 'supabase_migrations/09_allow_public_template_read.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log(`Running migration: ${path.basename(migrationPath)}`);
        await client.query(sql);

        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runhelper();
