# 🦕 Dino Runner Game

A comprehensive tutorial series for building a Dino Runner game using Deno and
TypeScript.

## Stage 4: Database Integration & Global Leaderboards

### Getting started

To run this project locally, you will need to install [Deno](https://deno.com/)
and set up a PostgreSQL database (we recommend Neon for cloud hosting).

```bash
# Start the server with environment variables loaded
deno run --allow-net --allow-env --allow-read --env src/main.ts
```

You can clone and deploy this project immediately to start building the Dino
Runner game.

[![Deploy on Deno](https://deno.com/button)](https://app.deno.com/new?clone=https://github.com/thisisjofrank/game-tutorial-stage-4.git)

Once deployed, you can clone the created project to your local machine to work
on it.

## Project structure

```text
Runner Game/
├── src/                          # Server-side source code
│   ├── main.ts                   # Enhanced server with database middleware
│   ├── middleware/               # Custom middleware
│   │   └── database.ts           # Database connection middleware
│   ├── database/                 # Database layer
│   │   ├── connection.ts         # PostgreSQL connection management
│   │   ├── schema.sql            # Complete database schema
│   │   └── migrations.ts         # Database initialization
│   └── routes/                   # Route definitions
│       ├── api.routes.ts         # Health check endpoint
│       ├── leaderboard.routes.ts # Leaderboard API endpoints
│       └── customization.routes.ts # Player customization API
├── public/                       # Client-side static files
│   ├── index.html                # Enhanced UI with modals & leaderboard
│   ├── js/
│   │   └── game.js               # Database-integrated game client
│   └── css/
│       └── styles.css            # Complete Stage 4 styling
├── deno.json                     # Deno configuration
├── .env.example                  # Environment variables template
└── README.md                     # Documentation
```

## What's New in Stage 4?

Stage 4 transforms our game into a full-featured web application with PostgreSQL
database integration, global leaderboards, player customization, and persistent
game data.

## Database Setup

### Option 1: Neon Cloud Database (Recommended)

Neon is a serverless PostgreSQL database that provides a free tier for
development, they will host your database online and handle scaling
automatically.

1. Create a Neon account, visit [neon.tech](https://neon.tech) and create a free
   account
2. Set up a new PostgreSQL database project
3. Copy the project connection string from the Neon dashboard
4. Update your .env file with the connection string details

### Option 2: Local PostgreSQL

1. [Install PostgreSQL](https://www.postgresql.org/download/)
2. Create database and user manually
3. Update your .env file with the database and user details

### Configuration

There is a `.env.example` provided in the repo which you can copy and update
with your own variables. Your `DATABASE_URL` should look like this:

```env
# For Neon database
DATABASE_URL=postgresql://username:password@host.neon.tech/dino_runner?sslmode=require

# For local PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/dino_runner
```

### Database Initialization

Run the `dev` task to automatically create tables and initialize the database:

```bash
deno task dev
```

The database will be initialized with:

- players
- high_scores
- player_settings
- game_sessions

## API Endpoints

### Leaderboard API

We have created a global leaderboard API that allows players to submit scores
and view rankings at `/api/leaderboard`. We can retrieve the top 10 scores and
submit new scores with GET and POST requests:

```js
// Get global leaderboard (top 10)
GET /api/leaderboard
Response: [
  {
    "rank": 1,
    "player_name": "DinoMaster",
    "score": 15420,
    "created_at": "2024-01-15T10:30:00Z"
  }
]

// Submit new score
POST /api/scores
Body: {
  "playerName": "YourName",
  "score": 12500
}

// Get player's best scores
GET /api/scores/{playerName}
```

### Customization API

We have implemented a player customization API that allows players to save their
preferences and retrieve available options at `/api/customization`. Players can
customize their dino color, background theme, difficulty preference, and sound
settings:

```js
// Save player customization
PUT /api/customization/{playerName}
Body: {
  "dinoColor": "#FF6B6B",
  "backgroundTheme": "forest",
  "difficultyPreference": "hard",
  "soundEnabled": true
}

// Get player settings
GET /api/customization/{playerName}

// Get available customization options
GET /api/customization/options
```

## What's in the code?

We've added several new features and improvements in Stage 4, including database
integration and player customization. The database connection is managed in
`src/database/connection.ts`, and the API endpoints are defined in
`src/routes/`.

### Database Connection (`src/database/connection.ts`)

We manage the PostgreSQL connection using the `postgres` module. The connection
is established using either the `DATABASE_URL` environment variable or
individual environment variables for user, password, database name, host, and
port:

```typescript
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
    console.log("�️ Database connected successfully");
  }

  return client;
}
```

This code implements a singleton pattern for database connections, ensuring we
only create one connection that's reused throughout the application.

The `client` variable stores the database connection globally, preventing
multiple connections from being created. It first checks for `DATABASE_URL`
(preferred for cloud databases like Neon), then falls back to individual
variables.

Once connected, the same client instance is returned on subsequent calls. The
connection process includes logging to help debug connection issues

This flexible approach means the same code works whether you're using a cloud
database service or a local PostgreSQL installation.

### Score Submission (`public/js/game.js`)

We have enhanced the game client to submit scores to the server and handle
leaderboard updates. The score submission function now includes detailed game
statistics and error handling:

```js
async submitScoreToDatabase(gameDuration) {
  if (!this.playerName) return;

  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: this.playerName,
        score: Math.floor(this.score),
        obstaclesAvoided: this.obstaclesAvoided,
        gameDuration: gameDuration,
        maxSpeed: this.maxSpeedReached,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isNewRecord) {
        console.log("🏆 NEW GLOBAL RECORD!");
        this.showNewRecordMessage();
      }
      console.log(`📊 Score submitted! Global rank: #${data.globalRank}`);
      // Refresh leaderboard
      this.loadGlobalLeaderboard();
    }
  } catch (error) {
    console.error("Failed to submit score:", error);
  }
}
```

This enhanced score submission function now tracks additional game metrics including obstacles avoided, game duration, and maximum speed reached. The server responds with global ranking information and indicates if the player achieved a new record.

The function gracefully handles network errors and provides detailed feedback about the submission status. On successful submission, it automatically refreshes the leaderboard display to show updated rankings.

### Player Customization

Players can personalize their gaming experience with different themes, colors, and difficulty settings. The customization system allows players to select their preferred dino color and background theme, which are saved in the database:

```js
applyCustomizations() {
  // Update canvas background
  const theme = this.themes[this.settings.backgroundTheme] || this.themes.desert;
  this.canvas.style.background = 
    `linear-gradient(to bottom, ${theme.sky} 0%, ${theme.sky} 75%, ${theme.ground} 75%, ${theme.ground} 100%)`;

  // Apply difficulty multiplier
  const difficultyMultipliers = { easy: 0.8, normal: 1.0, hard: 1.3 };
  this.initialGameSpeed = 3 * (difficultyMultipliers[this.settings.difficultyPreference] || 1.0);
  this.gameSpeed = this.initialGameSpeed;

  console.log(`🎨 Applied theme: ${this.settings.backgroundTheme}, difficulty: ${this.settings.difficultyPreference}`);
}
```

The customization system dynamically applies themes using predefined color schemes and adjusts game difficulty by modifying the initial game speed. The `applyCustomizations()` method updates the canvas background with CSS gradients and sets appropriate difficulty multipliers.

Settings are automatically saved to the database for registered players or localStorage for anonymous users. The system supports multiple themes (desert, forest, night, rainbow, space) and three difficulty levels (easy, normal, hard).

Players can access customization options through a modal interface with intuitive controls for color picking, theme selection, and difficulty adjustment.

## Enhanced UI Features

We have enhanced the user interface with modals, responsive design, and a modern button system to improve the player experience. The interface includes:

- Player name entry and customization panels with clean, accessible modals
- Consistent button styling using a base `.btn` class with variants (`.btn-primary`, `.btn-secondary`, etc.)
- Mobile-friendly design that adapts to different screen sizes
- Hover effects and animations for better user interaction

The HTML structure uses semantic elements and the updated button classes:

```html
<!-- Customization button -->
<button onclick="openCustomization()" class="btn btn-primary btn-block">
  Customize Game
</button>

<!-- Modal buttons -->
<div class="modal-buttons">
  <button onclick="savePlayerName()" class="btn btn-primary">Save & Play</button>
  <button onclick="closeModal('playerModal')" class="btn btn-secondary">Play Anonymous</button>
</div>
```

The CSS has been refactored to use a consolidated button system with CSS custom properties for consistent theming and maintainable styles.

## Gotchas

### BigInt Serialization Fix

PostgreSQL returns certain values as BigInt objects which cannot be serialized
to JSON by default. This has been resolved by explicitly converting database
values in the `leaderboard.routes.ts` file:

```ts
// Score submission with BigInt conversion
const rank = Number(rankResult.rows[0]?.rank) || 1;
const sanitizedScore = {
  ...insertedScore,
  id: Number(insertedScore.id),
  score: Number(insertedScore.score),
  obstacles_avoided: Number(insertedScore.obstacles_avoided || 0),
};
```

## Running Stage 4

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials (Neon DATABASE_URL recommended)

# Start the server with environment variables loaded
deno run dev
```

Navigate to [http://localhost:8000](http://localhost:8000) and experience the
complete database-integrated dino runner with global leaderboards and
customization!

### Quick Commands Reference

```bash
# Start the server (correct command with environment variables)
deno run dev

# Test database connection
psql "postgresql://your_connection_string_here"

# Clear player data for testing (run in browser console)
resetPlayerData()

# Check server status
curl http://localhost:8000/api/health
```

## Stage 4 Accomplishments

By completing Stage 4, you'll have:

- ✅ Integrated PostgreSQL database for persistent data storage
- ✅ Built global leaderboard system with real-time rankings
- ✅ Implemented player customization with theme and color options
- ✅ Created player profile system with persistent settings
- ✅ Added comprehensive API endpoints for data management
- ✅ Enhanced UI with modals, responsive design, and modern button system
- ✅ Implemented fallback systems for offline functionality
- ✅ Built scalable database schema for future features
- ✅ Added game analytics and session tracking with detailed metrics
- ✅ Created deployment-ready application with environment configuration
- ✅ Refactored CSS with consolidated button system and CSS custom properties
- ✅ Fixed BigInt serialization issues for Oak framework v17 compatibility
- ✅ Resolved player name modal timing and event handling issues

The game now provides a complete multiplayer experience with social features,
personalization, and persistent data! 🎮🏆
