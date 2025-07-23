import { Router } from "@oak/oak";
import type { Context } from "@oak/oak";

const router = new Router();

// Get global leaderboard
router.get("/api/leaderboard", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          hs.player_name,
          hs.score,
          hs.obstacles_avoided,
          hs.created_at,
          p.username,
          p.avatar_url
        FROM high_scores hs
        LEFT JOIN players p ON hs.player_id = p.id
        ORDER BY hs.score DESC
        LIMIT $1
      `,
        [limit],
      );

      ctx.response.body = {
        success: true,
        leaderboard: result.rows.map((row: any, index: number) => ({
          rank: index + 1,
          playerName: row.username || row.player_name,
          score: Number(row.score),
          obstaclesAvoided: Number(row.obstacles_avoided || 0),
          avatarUrl: row.avatar_url,
          date: row.created_at,
        })),
      };
    } finally {
      client.release(); // Release client back to pool
    }
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch leaderboard",
    };
  }
});

// Submit new high score
router.post("/api/scores", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const body = await ctx.request.body.json();
    const {
      playerName,
      score,
      obstaclesAvoided = 0,
      gameDuration = 0,
      maxSpeed = 0,
    } = body;

    // Validate input
    if (!playerName || typeof score !== "number" || score < 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Invalid player name or score",
      };
      return;
    }

    let rank: number;
    let insertedScore: any;

    // Insert high score
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO high_scores (
          player_name, 
          score, 
          obstacles_avoided, 
          game_duration_seconds,
          max_speed_reached
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `,
        [playerName, score, obstaclesAvoided, gameDuration, maxSpeed],
      );

      // Check if this is a new personal best or global record
      const rankResult = await client.query(
        `
        SELECT COUNT(*) + 1 as rank 
        FROM high_scores 
        WHERE score > $1
      `,
        [score],
      );

      rank = Number(rankResult.rows[0]?.rank) || 1;
      insertedScore = result.rows[0];
    } finally {
      client.release();
    }

    // Convert BigInt values to regular numbers to avoid JSON serialization issues
    const sanitizedScore = {
      ...insertedScore,
      id: Number(insertedScore.id),
      score: Number(insertedScore.score),
      obstacles_avoided: Number(insertedScore.obstacles_avoided || 0),
      game_duration_seconds: Number(insertedScore.game_duration_seconds || 0),
      max_speed_reached: Number(insertedScore.max_speed_reached || 0),
    };

    ctx.response.body = {
      success: true,
      score: sanitizedScore,
      globalRank: rank,
      isNewRecord: rank === 1,
    };

    console.log(
      `🏆 New high score: ${playerName} scored ${score} (Rank #${rank})`,
    );
  } catch (error) {
    console.error("❌ Error submitting score:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to submit score",
    };
  }
});

// Get player's personal best scores
router.get("/api/scores/:playerName", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const playerName = ctx.request.url.pathname.split("/").pop();

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT score, obstacles_avoided, created_at
        FROM high_scores
        WHERE player_name = $1
        ORDER BY score DESC
        LIMIT 5
      `,
        [playerName],
      );

      ctx.response.body = {
        success: true,
        playerName,
        personalBests: result.rows.map((row) => ({
          score: Number(row.score),
          obstaclesAvoided: Number(row.obstacles_avoided || 0),
          created_at: row.created_at,
        })),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error fetching player scores:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch player scores",
    };
  }
});

export { router as leaderboardRoutes };
