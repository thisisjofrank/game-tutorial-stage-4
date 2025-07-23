import { Context } from "@oak/oak";
import { getDatabase } from "../database/connection.ts";

export async function databaseMiddleware(
  ctx: Context,
  next: () => Promise<unknown>,
): Promise<void> {
  try {
    // Attach database pool to context
    ctx.state.db = getDatabase();
    await next();
  } catch (error) {
    console.error("❌ Database middleware error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Database connection failed",
      message: "Please try again later",
    };
  }
}
