import { Pool } from "npm:pg";

let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    // Try to use DATABASE_URL first (for Neon and other cloud providers)
    const databaseUrl = Deno.env.get("DATABASE_URL");

    if (databaseUrl) {
      console.log("🔧 Using DATABASE_URL for connection pool");
      pool = new Pool({
        connectionString: databaseUrl,
        max: 10, // 10 connections in pool
      });
    } else {
      // Check if Deno Deploy standard PostgreSQL environment variables are available
      const pgHost = Deno.env.get("PGHOST");
      const pgUser = Deno.env.get("PGUSER");

      if (pgHost && pgUser) {
        console.log("🔧 Using Deno Deploy PostgreSQL environment variables");
        // Deno Deploy automatically sets these standard PostgreSQL env vars
        const pgPassword = Deno.env.get("PGPASSWORD");
        pool = new Pool({
          host: pgHost,
          user: pgUser,
          password: pgPassword || undefined, // Use undefined instead of empty string
          database: Deno.env.get("PGDATABASE") || "postgres",
          port: parseInt(Deno.env.get("PGPORT") || "5432"),
          max: 10,
        });
      } else {
        // Fallback to custom environment variables for local development
        console.log(
          "🔧 Using custom DB environment variables (local development)",
        );
        const password = Deno.env.get("DB_PASSWORD");
        pool = new Pool({
          host: Deno.env.get("DB_HOST") || "localhost",
          port: parseInt(Deno.env.get("DB_PORT") || "5432"),
          database: Deno.env.get("DB_NAME") || "dino_runner",
          user: Deno.env.get("DB_USER") || "postgres",
          password: password || undefined, // Use undefined instead of empty string
          max: 10,
        });
      }
    }

    console.log("🗄️ Database pool created successfully");
  }

  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🗄️ Database pool closed");
  }
}
