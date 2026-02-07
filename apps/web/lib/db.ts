import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export default pool;

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        member_email TEXT,
        guest_count INTEGER DEFAULT 0,
        is_new BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        checkout_time TIMESTAMPTZ,
        date DATE DEFAULT CURRENT_DATE
      );

      CREATE TABLE IF NOT EXISTS signups (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        date DATE DEFAULT CURRENT_DATE
      );

      CREATE TABLE IF NOT EXISTS renewal_requests (
        id SERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        cleared BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS site_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_show TEXT,
        show_end_date TEXT,
        gallery_hours TEXT,
        gallery_times TEXT,
        upcoming JSONB DEFAULT '[]'
      );

      INSERT INTO site_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `);
  } finally {
    client.release();
  }
}
