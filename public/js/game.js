// Stage 4: Dino Runner Game with Database Integration & Customization
console.log("🦕 Stage 4: Database Integration & Customization loaded!");

class DinoGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreElement = document.getElementById("score");
    this.statusElement = document.getElementById("gameStatus");
    this.highScoreElement = document.getElementById("highScore");

    // Game state
    this.gameState = "waiting"; // 'waiting', 'playing', 'gameOver'
    this.score = 0;
    this.gameSpeed = 3;
    this.initialGameSpeed = 3;

    // Player data
    this.playerName = localStorage.getItem("playerName") || null;
    this.obstaclesAvoided = 0;
    this.gameStartTime = 0;
    this.maxSpeedReached = 0;

    // Customization settings
    this.settings = {
      dinoColor: "#4CAF50",
      backgroundTheme: "desert",
      soundEnabled: true,
      difficultyPreference: "normal"
    };

    // Dino properties
    this.dino = {
      x: 50,
      y: 150,
      width: 40,
      height: 40,
      velocityY: 0,
      isJumping: false,
      groundY: 150
    };

    // Physics
    this.gravity = 0.6;
    this.jumpStrength = -12;

    // Ground
    this.groundY = 180;

    // Obstacles
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnRate = 120; // frames between spawns
    this.minObstacleSpawnRate = 60;

    // Animation frame counter
    this.frameCount = 0;

    // High score
    this.highScore = this.loadHighScore();

    // Theme colors
    this.themes = {
      desert: { sky: "#87CEEB", ground: "#DEB887" },
      forest: { sky: "#98FB98", ground: "#228B22" },
      night: { sky: "#191970", ground: "#2F4F4F" },
      rainbow: { sky: "#FF69B4", ground: "#FFD700" },
      space: { sky: "#000000", ground: "#696969" }
    };

    this.init();
  }

  init() {
    console.log(`🎮 Initializing game... Player name: ${this.playerName}`);
    this.setupEventListeners();
    this.loadPlayerSettings();
    this.loadGlobalLeaderboard();
    this.gameLoop();
    this.updateStatus("Click to Start!");
    this.updateHighScore();
    this.showPlayerNamePrompt();
  }

  async loadPlayerSettings() {
    try {
      if (this.playerName) {
        const response = await fetch(`/api/customization/${this.playerName}`);
        if (response.ok) {
          const data = await response.json();
          this.settings = data.settings;
          this.applyCustomizations();
        }
      } else {
        // Load from localStorage for anonymous users
        const savedSettings = localStorage.getItem("gameSettings");
        if (savedSettings) {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
          this.applyCustomizations();
        }
      }
    } catch (error) {
      console.log("Using default settings:", error);
    }
  }

  applyCustomizations() {
    // Update canvas background
    const theme = this.themes[this.settings.backgroundTheme] || this.themes.desert;
    this.canvas.style.background = `linear-gradient(to bottom, ${theme.sky} 0%, ${theme.sky} 75%, ${theme.ground} 75%, ${theme.ground} 100%)`;

    // Apply difficulty multiplier
    const difficultyMultipliers = { easy: 0.8, normal: 1.0, hard: 1.3 };
    this.initialGameSpeed = 3 * (difficultyMultipliers[this.settings.difficultyPreference] || 1.0);
    this.gameSpeed = this.initialGameSpeed;

    console.log(`🎨 Applied theme: ${this.settings.backgroundTheme}, difficulty: ${this.settings.difficultyPreference}`);
  }

  async savePlayerSettings() {
    try {
      if (this.playerName) {
        await fetch("/api/customization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName: this.playerName,
            ...this.settings
          })
        });
      } else {
        // Save to localStorage for anonymous users
        localStorage.setItem("gameSettings", JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  async loadGlobalLeaderboard() {
    try {
      const response = await fetch("/api/leaderboard?limit=5");
      if (response.ok) {
        const data = await response.json();
        this.displayLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.log("Failed to load leaderboard:", error);
    }
  }

  displayLeaderboard(leaderboard) {
    const leaderboardElement = document.getElementById("leaderboardList");
    if (leaderboardElement && leaderboard) {
      leaderboardElement.innerHTML = leaderboard
        .map(
          (entry) => `
        <div class="leaderboard-entry">
          <span class="rank">#${entry.rank}</span>
          <span class="name">${entry.playerName}</span>
          <span class="hscore">${entry.score}</span>
        </div>
      `
        )
        .join("");
    }
  }

  showPlayerNamePrompt() {
    console.log(`🎮 Checking player name... Current: "${this.playerName}"`);
    if (!this.playerName || this.playerName === "" || this.playerName === "null") {
      console.log("🎮 No player name found, showing prompt...");
      setTimeout(() => {
        const modal = document.getElementById("playerModal");
        if (modal) {
          console.log("🎮 Opening player modal...");
          window.openModal("playerModal");
          // Set focus to input and attach event listener
          const input = document.getElementById("playerNameInput");
          if (input) {
            input.focus();
            // Remove existing listener and add new one
            input.removeEventListener("keypress", this.handlePlayerNameEnter);
            input.addEventListener("keypress", this.handlePlayerNameEnter);
          }
        } else {
          console.log("🎮 Modal not found, using prompt fallback...");
          // Fallback if modal doesn't exist
          const name = prompt("Enter your name for the leaderboard:");
          if (name && name.trim()) {
            this.setPlayerName(name.trim());
          }
        }
      }, 1000);
    } else {
      console.log(`🎮 Player name found: ${this.playerName}`);
    }
  }

  handlePlayerNameEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      window.savePlayerName();
    }
  }

  setPlayerName(name) {
    this.playerName = name;
    localStorage.setItem("playerName", name);
    this.loadPlayerSettings();
    console.log(`👤 Player name set: ${name}`);
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.handleJump();
      }
    });

    // Mouse/touch controls
    this.canvas.addEventListener("click", () => {
      this.handleJump();
    });

    // Prevent space bar from scrolling
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    });
  }

  handleJump() {
    if (this.gameState === "waiting") {
      this.startGame();
    } else if (this.gameState === "playing" && !this.dino.isJumping) {
      this.jump();
    } else if (this.gameState === "gameOver") {
      this.resetGame();
    }
  }

  startGame() {
    this.gameState = "playing";
    this.score = 0;
    this.obstaclesAvoided = 0;
    this.gameStartTime = Date.now();
    this.maxSpeedReached = this.gameSpeed;
    this.gameSpeed = this.initialGameSpeed;
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.frameCount = 0;
    this.updateScore();
    this.updateStatus("");
    console.log("🎮 Game started!");
  }

  jump() {
    if (!this.dino.isJumping) {
      this.dino.velocityY = this.jumpStrength;
      this.dino.isJumping = true;
      console.log("🦘 Dino jumped!");
    }
  }

  spawnObstacle() {
    // Random obstacle types
    const obstacleTypes = [
      { width: 20, height: 40, type: "cactus-small" },
      { width: 25, height: 50, type: "cactus-medium" },
      { width: 30, height: 35, type: "cactus-wide" }
    ];

    const obstacle = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    this.obstacles.push({
      x: this.canvas.width,
      y: this.groundY - obstacle.height,
      width: obstacle.width,
      height: obstacle.height,
      type: obstacle.type
    });
  }

  updateObstacles() {
    if (this.gameState !== "playing") return;

    // Spawn new obstacles
    this.obstacleSpawnTimer++;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnRate) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Move and remove obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= this.gameSpeed;

      // Remove obstacles that are off screen
      if (this.obstacles[i].x + this.obstacles[i].width < 0) {
        this.obstacles.splice(i, 1);
        this.obstaclesAvoided++;
        this.score += 10; // Bonus points for avoiding obstacle
      }
    }
  }

  checkCollisions() {
    if (this.gameState !== "playing") return;

    for (let obstacle of this.obstacles) {
      if (this.dino.x < obstacle.x + obstacle.width && this.dino.x + this.dino.width > obstacle.x && this.dino.y < obstacle.y + obstacle.height && this.dino.y + this.dino.height > obstacle.y) {
        this.gameOver();
        return;
      }
    }
  }

  updateGameDifficulty() {
    if (this.gameState !== "playing") return;

    // Increase difficulty every 200 points
    const difficultyLevel = Math.floor(this.score / 200);
    this.gameSpeed = this.initialGameSpeed + difficultyLevel * 0.5;
    this.maxSpeedReached = Math.max(this.maxSpeedReached, this.gameSpeed);
    this.obstacleSpawnRate = Math.max(this.minObstacleSpawnRate, 120 - difficultyLevel * 10);
  }

  async gameOver() {
    this.gameState = "gameOver";
    const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);

    // Submit score to database
    await this.submitScoreToDatabase(gameDuration);

    this.saveHighScore();
    this.updateHighScore();
    this.updateStatus("Game Over! Click to restart");
    console.log(`💀 Game Over! Final Score: ${Math.floor(this.score)} (${this.obstaclesAvoided} obstacles avoided)`);
  }

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
          maxSpeed: this.maxSpeedReached
        })
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

  showNewRecordMessage() {
    const recordMsg = document.createElement("div");
    recordMsg.className = "new-record-message";
    recordMsg.innerHTML = "🏆 NEW GLOBAL RECORD! 🏆";
    document.body.appendChild(recordMsg);
    setTimeout(() => recordMsg.remove(), 3000);
  }

  loadHighScore() {
    return parseInt(localStorage.getItem("dinoHighScore")) || 0;
  }

  saveHighScore() {
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem("dinoHighScore", this.highScore);
      console.log(`🏆 New High Score: ${this.highScore}!`);
    }
  }

  updateHighScore() {
    if (this.highScoreElement) {
      this.highScoreElement.textContent = this.highScore;
    }
  }

  updatePhysics() {
    if (this.gameState !== "playing") return;

    this.frameCount++;

    // Apply gravity
    this.dino.velocityY += this.gravity;
    this.dino.y += this.dino.velocityY;

    // Ground collision
    if (this.dino.y >= this.dino.groundY) {
      this.dino.y = this.dino.groundY;
      this.dino.velocityY = 0;
      this.dino.isJumping = false;
    }

    // Update score (continuous scoring)
    this.score += 0.1;
    this.updateScore();

    // Update obstacles
    this.updateObstacles();

    // Check collisions
    this.checkCollisions();

    // Update difficulty
    this.updateGameDifficulty();
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw obstacles
    this.drawObstacles();

    // Draw dino
    this.drawDino();

    // Draw instructions if waiting
    if (this.gameState === "waiting") {
      this.drawInstructions();
    }

    // Draw game over screen
    if (this.gameState === "gameOver") {
      this.drawGameOver();
    }
  }

  drawObstacles() {
    this.ctx.fillStyle = "#2E7D32";

    for (let obstacle of this.obstacles) {
      // Draw main cactus body
      this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Add cactus details based on type
      this.ctx.fillStyle = "#1B5E20";
      if (obstacle.type === "cactus-small") {
        // Small spikes
        this.ctx.fillRect(obstacle.x - 3, obstacle.y + 10, 6, 4);
        this.ctx.fillRect(obstacle.x + obstacle.width - 3, obstacle.y + 20, 6, 4);
      } else if (obstacle.type === "cactus-medium") {
        // Medium spikes
        this.ctx.fillRect(obstacle.x - 4, obstacle.y + 8, 8, 6);
        this.ctx.fillRect(obstacle.x + obstacle.width - 4, obstacle.y + 15, 8, 6);
        this.ctx.fillRect(obstacle.x + obstacle.width / 2 - 2, obstacle.y + 25, 4, 8);
      } else if (obstacle.type === "cactus-wide") {
        // Wide cactus with multiple arms
        this.ctx.fillRect(obstacle.x - 5, obstacle.y + 5, 10, 8);
        this.ctx.fillRect(obstacle.x + obstacle.width - 5, obstacle.y + 10, 10, 8);
        this.ctx.fillRect(obstacle.x + obstacle.width / 2 - 3, obstacle.y + 20, 6, 6);
      }

      this.ctx.fillStyle = "#2E7D32"; // Reset color for next obstacle
    }
  }
  drawDino() {
    const strideActive = this.gameState === "playing" && !this.dino.isJumping;
    const legStride = strideActive ? (Math.floor(this.frameCount / 8) % 2 === 0 ? 2 : -2) : 0;
    const legBaseY = this.dino.y + this.dino.height - 2;

    this.ctx.fillStyle = "green";
    this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);

    this.ctx.fillStyle = "darkgreen";
    this.ctx.fillRect(this.dino.x + 25, this.dino.y + 8, 4, 4);
    this.ctx.fillRect(this.dino.x + 30, this.dino.y + 20, 8, 2);

    if (!this.dino.isJumping) {
      this.ctx.fillStyle = "green";
      this.ctx.fillRect(this.dino.x + 10, legBaseY + legStride, 6, 8);
      this.ctx.fillRect(this.dino.x + 24, legBaseY - legStride, 6, 8);
    }
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return "#" + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
  }

  drawGameOver() {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Game Over text
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 40);

    // Final score
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Final Score: ${Math.floor(this.score)}`, this.canvas.width / 2, this.canvas.height / 2 - 5);

    // High score
    if (Math.floor(this.score) === this.highScore && this.highScore > 0) {
      this.ctx.fillStyle = "#FFD700";
      this.ctx.fillText("🏆 NEW HIGH SCORE! 🏆", this.canvas.width / 2, this.canvas.height / 2 + 25);
    } else if (this.highScore > 0) {
      this.ctx.fillStyle = "#CCCCCC";
      this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 25);
    }

    // Restart instruction
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "16px Arial";
    this.ctx.fillText("Click or press SPACE to restart", this.canvas.width / 2, this.canvas.height / 2 + 55);
  }

  drawInstructions() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Press SPACE or ↑ to jump!", this.canvas.width / 2, this.canvas.height / 2 - 20);

    this.ctx.font = "16px Arial";
    this.ctx.fillText("Click anywhere to start", this.canvas.width / 2, this.canvas.height / 2 + 10);
  }

  updateScore() {
    this.scoreElement.textContent = Math.floor(this.score);
  }

  updateStatus(message) {
    this.statusElement.textContent = message;
    this.statusElement.style.display = message ? "block" : "none";
  }

  resetGame() {
    this.gameState = "waiting";
    this.score = 0;
    this.gameSpeed = this.initialGameSpeed;
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.frameCount = 0;
    this.dino.y = this.dino.groundY;
    this.dino.velocityY = 0;
    this.dino.isJumping = false;
    this.updateScore();
    this.updateStatus("Click to Start!");
    console.log("🔄 Game reset!");
  }

  gameLoop() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Health check for server
async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    console.log("🎉 Server health check:", data);
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }
}

// Initialize game when page loads
window.addEventListener("load", () => {
  checkHealth();
  window.dinoGame = new DinoGame();
  console.log(
    "🎯 Stage 4 complete: Database integration and customization ready!",
  );
});

// Add a function to reset player data for testing
window.resetPlayerData = function () {
  localStorage.removeItem("playerName");
  localStorage.removeItem("gameSettings");
  localStorage.removeItem("dinoHighScore");
  location.reload();
  console.log("🔄 Player data reset!");
};

// Global functions for UI interaction
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
    modal.style.display = "flex";

    // Set focus to input if it's the player modal
    if (modalId === "playerModal") {
      setTimeout(() => {
        const input = document.getElementById("playerNameInput");
        if (input) {
          input.focus();
          input.select(); // Select any existing text
        }
      }, 100);
    }
  }
};

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
  }
};

window.savePlayerName = function () {
  const input = document.getElementById("playerNameInput");
  const playerName = input?.value.trim();

  if (playerName && playerName.length > 0 && playerName.length <= 20) {
    localStorage.setItem("playerName", playerName);
    const playerDisplay = document.getElementById("playerNameDisplay");
    if (playerDisplay) {
      playerDisplay.textContent = playerName;
    }
    if (window.dinoGame) {
      window.dinoGame.setPlayerName(playerName);
    }
    window.closeModal("playerModal");
    console.log(`✅ Player name saved: ${playerName}`);
  } else if (!playerName || playerName.length === 0) {
    alert("Please enter a name");
  } else {
    alert("Please enter a valid name (1-20 characters)");
  }
};

window.openCustomization = function () {
  window.openModal("customizationModal");
  // Populate current settings
  const colorPicker = document.getElementById("dinoColorPicker");
  const themeSelect = document.getElementById("backgroundTheme");
  const soundToggle = document.getElementById("soundEnabled");
  const difficultySelect = document.getElementById("difficultyPreference");

  if (window.dinoGame) {
    if (colorPicker) colorPicker.value = window.dinoGame.settings.dinoColor;
    if (themeSelect) {
      themeSelect.value = window.dinoGame.settings.backgroundTheme;
    }
    if (soundToggle) {
      soundToggle.checked = window.dinoGame.settings.soundEnabled;
    }
    if (difficultySelect) {
      difficultySelect.value = window.dinoGame.settings.difficultyPreference;
    }
  }
};

window.saveCustomization = function () {
  const colorPicker = document.getElementById("dinoColorPicker");
  const themeSelect = document.getElementById("backgroundTheme");
  const soundToggle = document.getElementById("soundEnabled");
  const difficultySelect = document.getElementById("difficultyPreference");

  if (window.dinoGame) {
    window.dinoGame.settings = {
      dinoColor: colorPicker?.value || window.dinoGame.settings.dinoColor,
      backgroundTheme: themeSelect?.value ||
        window.dinoGame.settings.backgroundTheme,
      soundEnabled: soundToggle?.checked ??
        window.dinoGame.settings.soundEnabled,
      difficultyPreference: difficultySelect?.value ||
        window.dinoGame.settings.difficultyPreference,
    };

    window.dinoGame.applyCustomizations();
    window.dinoGame.savePlayerSettings();
  }

  window.closeModal("customizationModal");
};

// Leaderboard management
window.loadLeaderboard = async function () {
  try {
    const response = await fetch("/api/leaderboard");
    if (response.ok) {
      const data = await response.json();
      displayLeaderboard(data.leaderboard);
    } else {
      displayLeaderboardError();
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    displayLeaderboardError();
  }
};

function displayLeaderboard(leaderboard) {
  const leaderboardList = document.getElementById("leaderboardList");

  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML =
      '<div class="loading">No scores yet. Be the first!</div>';
    return;
  }

  const html = leaderboard.map((entry, index) => {
    const rank = entry.rank || (index + 1);
    let rankClass = "";

    if (rank === 1) rankClass = "gold";
    else if (rank === 2) rankClass = "silver";
    else if (rank === 3) rankClass = "bronze";

    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${rank}</div>
        <div class="leaderboard-name">${entry.playerName}</div>
        <div class="leaderboard-score">${entry.score.toLocaleString()}</div>
      </div>
    `;
  }).join("");

  leaderboardList.innerHTML = html;
}

function displayLeaderboardError() {
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML =
    '<div class="loading">Unable to load leaderboard. Check your connection.</div>';
}

// Initialize UI when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Load player name
  const savedPlayerName = localStorage.getItem("playerName");
  const playerNameDisplay = document.getElementById("playerNameDisplay");
  if (savedPlayerName && playerNameDisplay) {
    playerNameDisplay.textContent = savedPlayerName;
  }

  // Load leaderboard
  window.loadLeaderboard();

  // Note: Player modal is now handled by DinoGame.showPlayerNamePrompt()
  console.log("🎮 DOM loaded, player modal handled by game class");

  // Add click outside modal to close
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("modal")) {
      const modalId = event.target.id;
      window.closeModal(modalId);
    }
  });

  // Add Enter key support for player name input (backup listener)
  document.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      const activeModal = document.querySelector('.modal[style*="flex"]');
      if (activeModal && activeModal.id === "playerModal") {
        const input = document.getElementById("playerNameInput");
        if (input && document.activeElement === input) {
          event.preventDefault();
          window.savePlayerName();
        }
      }
    }
  });
});
