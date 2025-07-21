-- Stage 4: Database schema for Dino Runner Game

-- Players table for user accounts
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- High scores table for global leaderboard
CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL, -- For anonymous players
  score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER DEFAULT 0,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player customization settings
CREATE TABLE IF NOT EXISTS player_settings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  dino_color VARCHAR(7) DEFAULT '#4CAF50',
  background_theme VARCHAR(20) DEFAULT 'desert',
  sound_enabled BOOLEAN DEFAULT true,
  difficulty_preference VARCHAR(20) DEFAULT 'normal',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id)
);

-- Game sessions for analytics
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  final_score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER NOT NULL,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  session_data JSONB, -- For storing additional game metrics
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_created_at ON high_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Sample data for development
INSERT INTO players (username, email) VALUES 
  ('DinoMaster', 'dinomaster@example.com'),
  ('CactusJumper', 'cactus@example.com'),
  ('SpeedRunner', 'speed@example.com')
ON CONFLICT (username) DO NOTHING;

INSERT INTO high_scores (player_name, score, obstacles_avoided) VALUES 
  ('DinoMaster', 1250, 25),
  ('CactusJumper', 980, 19),
  ('SpeedRunner', 1500, 30),
  ('Anonymous', 750, 15),
  ('ProGamer', 2000, 40)
ON CONFLICT DO NOTHING;
