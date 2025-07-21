import { getDatabase } from "./connection.ts";

export async function initializeDatabase(): Promise<void> {
    const db = await getDatabase();

    console.log("🚀 Initializing database schema...");

    const schema = await Deno.readTextFile("./src/database/schema.sql");
    await db.queryArray(schema);

    console.log("✅ Database schema initialized successfully");
}

export async function runMigrations(): Promise<void> {
    // Future migrations can be added here
    console.log("📦 No pending migrations");
}
