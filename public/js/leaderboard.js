let leaderboardData = [];

async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard?limit=50");
    const data = await response.json();

    if (data.success && data.leaderboard) {
      leaderboardData = data.leaderboard;
      renderLeaderboard();
      updateLastUpdated();
    } else {
      throw new Error(data.error || "Failed to load leaderboard");
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    renderError();
  }
}

function renderLeaderboard() {
  const content = document.getElementById("leaderboard-content");

  if (leaderboardData.length === 0) {
    content.innerHTML = `
                    <div class="empty-state">
                        <h3>🎯 No scores yet!</h3>
                        <p>Be the first to set a high score!</p>
                        <a href="/" class="btn">🎮 Start Playing</a>
                    </div>
                `;
    return;
  }

  const tableHTML = `
                <div class="leaderboard-grid">
                    <h4 class="tl">Rank</h4>
                    <h4 class="tl">Player</h4>
                    <h4>Score</h4>
                    <h4>Obstacles</h4>
                    <h4>Date</h4>

                    ${
    leaderboardData.map((entry) => `
                        <span class="tl rank-${
      entry.rank <= 3 ? entry.rank : ""
    }">#${entry.rank}</span>
                
                        <div class="player tl">
                            <span class="avatar" style="background-color: ${
      playerInitialsToColor(entry.playerName)
    };">${getPlayerInitials(entry.playerName)}</span>
                            <span>${escapeHtml(entry.playerName)}</span>
                        </div>
                    
                        <span>${entry.score.toLocaleString()}</span>
                        <span>${entry.obstaclesAvoided || 0}</span>
                        <span>${formatDate(entry.date)}</span>
                    `).join("")
  }
                <div>
            `;

  content.innerHTML = tableHTML;
}

function renderError() {
  const content = document.getElementById("leaderboard-content");
  content.innerHTML = `
                <div class="error">
                    <h3>⚠️ Unable to load leaderboard</h3>
                    <p>Please check your connection and try again.</p>
                    <button onclick="refreshLeaderboard()" class="btn refresh-btn">🔄 Try Again</button>
                </div>
            `;
}

function getPlayerInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

function playerInitialsToColor(name) {
  // Super simple: just use the first character of the name
  const firstChar = name.charCodeAt(0);
  const hue = (firstChar * 7) % 360; // Multiply by 7 for better distribution
  return `hsl(${hue}, 70%, 50%)`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateLastUpdated() {
  const lastUpdated = document.getElementById("last-updated");
  const now = new Date();
  lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

async function refreshLeaderboard() {
  const content = document.getElementById("leaderboard-content");
  content.innerHTML = `
                <div class="loading">
                    <div>🔄 Refreshing leaderboard...</div>
                </div>
            `;
  await loadLeaderboard();
}

// Auto-refresh every 30 seconds
setInterval(loadLeaderboard, 30000);

// Load leaderboard on page load
document.addEventListener("DOMContentLoaded", loadLeaderboard);
