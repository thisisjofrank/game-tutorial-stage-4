import { Router } from "@oak/oak";
import type { RouterContext } from "@oak/oak";

const router = new Router();

// Get player customization settings
router.get("/api/customization/:playerName", async (ctx: RouterContext<"/api/customization/:playerName">) => {
    try {
        const db = ctx.state.db;
        const playerName = ctx.params.playerName;

        // First try to find registered player
        const playerResult = await db.queryObject(`
      SELECT id FROM players WHERE username = $1
    `, [playerName]);

        let settings = {
            dinoColor: '#4CAF50',
            backgroundTheme: 'desert',
            soundEnabled: true,
            difficultyPreference: 'normal'
        };

        if (playerResult.rows.length > 0) {
            const playerId = Number(playerResult.rows[0].id);
            const settingsResult = await db.queryObject(`
        SELECT dino_color, background_theme, sound_enabled, difficulty_preference
        FROM player_settings
        WHERE player_id = $1
      `, [playerId]);

            if (settingsResult.rows.length > 0) {
                const row = settingsResult.rows[0];
                settings = {
                    dinoColor: row.dino_color,
                    backgroundTheme: row.background_theme,
                    soundEnabled: row.sound_enabled,
                    difficultyPreference: row.difficulty_preference
                };
            }
        } else {
            // Check localStorage-style settings for anonymous players
            const anonSettings = ctx.request.url.searchParams.get('settings');
            if (anonSettings) {
                try {
                    settings = { ...settings, ...JSON.parse(anonSettings) };
                } catch {
                    // Use defaults if parsing fails
                }
            }
        }

        ctx.response.body = {
            success: true,
            playerName,
            settings
        };
    } catch (error) {
        console.error("❌ Error fetching customization:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: "Failed to fetch customization settings"
        };
    }
});

// Save player customization settings
router.post("/api/customization", async (ctx: RouterContext<"/api/customization">) => {
    try {
        const db = ctx.state.db;
        const body = await ctx.request.body.json();
        const {
            playerName,
            dinoColor,
            backgroundTheme,
            soundEnabled,
            difficultyPreference
        } = body;

        // Validate input
        const validThemes = ['desert', 'forest', 'night', 'rainbow', 'space'];
        const validDifficulties = ['easy', 'normal', 'hard'];

        if (!playerName || !dinoColor || !validThemes.includes(backgroundTheme)) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                error: "Invalid customization data"
            };
            return;
        }

        // Create or find player
        let playerId: number;
        const playerResult = await db.queryObject(`
      INSERT INTO players (username) VALUES ($1)
      ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [playerName]);

        playerId = Number(playerResult.rows[0].id);

        // Save settings
        await db.queryObject(`
      INSERT INTO player_settings (
        player_id, 
        dino_color, 
        background_theme, 
        sound_enabled, 
        difficulty_preference
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (player_id) DO UPDATE SET
        dino_color = $2,
        background_theme = $3,
        sound_enabled = $4,
        difficulty_preference = $5,
        updated_at = NOW()
    `, [playerId, dinoColor, backgroundTheme, soundEnabled, difficultyPreference]);

        ctx.response.body = {
            success: true,
            message: "Customization settings saved successfully"
        };

        console.log(`🎨 Customization saved for ${playerName}: ${backgroundTheme} theme, ${dinoColor} dino`);

    } catch (error) {
        console.error("❌ Error saving customization:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: "Failed to save customization settings"
        };
    }
});

// Get available customization options
router.get("/api/customization/options", async (ctx: RouterContext<"/api/customization/options">) => {
    ctx.response.body = {
        success: true,
        options: {
            themes: [
                { id: 'desert', name: '🏜️ Desert', colors: { sky: '#87CEEB', ground: '#DEB887' } },
                { id: 'forest', name: '🌲 Forest', colors: { sky: '#98FB98', ground: '#228B22' } },
                { id: 'night', name: '🌙 Night', colors: { sky: '#191970', ground: '#2F4F4F' } },
                { id: 'rainbow', name: '🌈 Rainbow', colors: { sky: '#FF69B4', ground: '#FFD700' } },
                { id: 'space', name: '🚀 Space', colors: { sky: '#000000', ground: '#696969' } }
            ],
            dinoColors: [
                '#4CAF50', '#FF5722', '#2196F3', '#FF9800',
                '#9C27B0', '#F44336', '#00BCD4', '#795548'
            ],
            difficulties: [
                { id: 'easy', name: 'Easy', speedMultiplier: 0.8 },
                { id: 'normal', name: 'Normal', speedMultiplier: 1.0 },
                { id: 'hard', name: 'Hard', speedMultiplier: 1.3 }
            ]
        }
    };
});

export { router as customizationRoutes };
