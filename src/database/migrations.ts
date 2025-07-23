import { getDatabase } from "./connection.ts";

export async function initializeDatabase(): Promise<void> {
  const pool = getDatabase();

  console.log("🚀 Initializing database schema...");

  const schema = await Deno.readTextFile("./src/database/schema.sql");

  // Use pool.query() for schema initialization with npm:pg
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log("✅ Database schema initialized successfully");
  } finally {
    client.release(); // Release client back to pool
  }
}

export function runMigrations(): void {
  // Future migrations can be added here
  console.log("📦 No pending migrations");
}
