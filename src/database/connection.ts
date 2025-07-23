import { Client } from "@db/postgres";

let client: Client | null = null;

export async function getDatabase(): Promise<Client> {
  if (!client) {
    // Try to use DATABASE_URL first (for Neon and other cloud providers)
    const databaseUrl = Deno.env.get("DATABASE_URL");

    if (databaseUrl) {
      console.log("🔧 Using DATABASE_URL for connection");
      client = new Client(databaseUrl);
    } else {
      // Fallback to individual environment variables
      console.log("🔧 Using individual DB environment variables");
      client = new Client({
        user: Deno.env.get("DB_USER") || "postgres",
        password: Deno.env.get("DB_PASSWORD") || "",
        database: Deno.env.get("DB_NAME") || "dino_runner",
        hostname: Deno.env.get("DB_HOST") || "localhost",
        port: parseInt(Deno.env.get("DB_PORT") || "5432"),
      });
    }

    await client.connect();
    console.log("🗄️ Database connected successfully");
  }

  return client;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    console.log("🗄️ Database connection closed");
  }
}
