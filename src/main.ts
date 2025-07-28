import { Application } from "jsr:@oak/oak/application";
import { apiRouter } from "./routes/api.routes.ts";
import { leaderboardRoutes } from "./routes/leaderboard.routes.ts";
import { customizationRoutes } from "./routes/customization.routes.ts";
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "localhost";

const app = new Application();

// Initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// CORS middleware for API requests
app.use(async (context, next) => {
  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  context.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (context.request.method === "OPTIONS") {
    context.response.status = 200;
    return;
  }
  await next();
});

// Database middleware for API routes
app.use(databaseMiddleware);

// Serve static files from public directory
app.use(async (context, next) => {
  try {
    // Special route for leaderboard page
    if (context.request.url.pathname === "/leaderboard") {
      await context.send({
        root: `${Deno.cwd()}/public`,
        path: "leaderboard.html",
      });
      return;
    }

    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

// API routes
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

app.use(leaderboardRoutes.routes());
app.use(leaderboardRoutes.allowedMethods());

app.use(customizationRoutes.routes());
app.use(customizationRoutes.allowedMethods());

app.listen({
  port: PORT,
});

console.log(`🦕 Server is running on http://${HOST}:${PORT}`);
console.log(`🎯 Visit http://${HOST}:${PORT} to see the game`);
console.log(`🔧 API health check at http://${HOST}:${PORT}/api/health`);
console.log(`🏆 Global Leaderboard at http://${HOST}:${PORT}/leaderboard`);
console.log(`🏆 Leaderboard API at http://${HOST}:${PORT}/api/leaderboard`);
console.log(
  `🎨 Customization API at http://${HOST}:${PORT}/api/customization/options`,
);
