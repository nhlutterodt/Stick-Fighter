// healthBar.js - Modern, event-driven health bar UI for Stick Fighter
// Author: Modularized for ES, accessibility, and advanced UI/UX

import { eventManager } from '../game/eventManager.js';

const PLAYER_IDS = [1, 2];
const HEALTH_BAR_IDS = ['player1HealthBarInner', 'player2HealthBarInner'];
const HEALTH_LABELS = ['Player 1 Health', 'Player 2 Health'];
const LOW_HEALTH_THRESHOLD = 0.25; // 25%

function getHealthBarEl(playerIdx) {
  return document.getElementById(HEALTH_BAR_IDS[playerIdx]);
}

function getHealthBarContainer() {
  return document.getElementById('healthBars');
}

// --- Utility: Get current health percent for a player (0-1) ---
function getHealthPercent(player) {
  if (!player || typeof player.health !== 'number' || typeof player.maxHealth !== 'number' || player.maxHealth === 0) return 0;
  return Math.max(0, Math.min(1, player.health / player.maxHealth));
}

// --- Utility: Reset all health bars to full ---
function resetHealthBars() {
  PLAYER_IDS.forEach((_, idx) => {
    const bar = getHealthBarEl(idx);
    if (bar) {
      bar.style.width = '100%';
      bar.classList.remove('low-health', 'heal-effect', 'damage-effect');
      bar.setAttribute('aria-valuenow', 100);
    }
  });
}

// --- Debug: Log health bar state ---
function logHealthBarState(player) {
  try {
    let idx;
    if (player.playerIndex !== undefined) {
      idx = player.playerIndex;
    } else if (player.id === 2) {
      idx = 1;
    } else {
      idx = 0;
    }
    const bar = getHealthBarEl(idx);
    if (!bar) {
      console.warn(`[healthBar] No health bar found for player index ${idx}`);
      return;
    }
    const percent = getHealthPercent(player);
    console.debug(`[healthBar] Player ${idx + 1}: health=${player.health}, maxHealth=${player.maxHealth}, percent=${(percent * 100).toFixed(1)}%, barWidth=${bar.style.width}`);
  } catch (e) {
    console.warn('[healthBar] logHealthBarState error:', e);
  }
}

// --- Enhanced error handling for DOM attachment ---
function ensureHealthBarDOM() {
  const container = getHealthBarContainer();
  if (!container) {
    console.error('[healthBar] Health bar container not found in DOM.');
    return false;
  }
  for (const id of HEALTH_BAR_IDS) {
    if (!document.getElementById(id)) {
      console.error(`[healthBar] Health bar inner element missing: ${id}`);
      return false;
    }
  }
  return true;
}

// Patch updateHealthBar to use new utilities and debug
function updateHealthBar(player) {
  try {
    if (!player || typeof player.health !== 'number' || typeof player.maxHealth !== 'number') return;
    let idx;
    if (player.playerIndex !== undefined) {
      idx = player.playerIndex;
    } else if (player.id === 2) {
      idx = 1;
    } else {
      idx = 0;
    }
    const bar = getHealthBarEl(idx);
    if (!bar) {
      console.warn(`[healthBar] No health bar found for player index ${idx}`);
      return;
    }
    const percent = getHealthPercent(player);
    bar.style.width = (percent * 100) + '%';
    bar.setAttribute('aria-valuenow', Math.round(percent * 100));
    bar.setAttribute('aria-valuemax', 100);
    bar.setAttribute('aria-label', HEALTH_LABELS[idx]);
    // Low health pulse
    if (percent <= LOW_HEALTH_THRESHOLD) {
      bar.classList.add('low-health');
    } else {
      bar.classList.remove('low-health');
    }
    // Animate heal/damage
    if (player._lastHealth !== undefined) {
      if (player.health > player._lastHealth) {
        bar.classList.add('heal-effect');
        setTimeout(() => bar.classList.remove('heal-effect'), 500);
      } else if (player.health < player._lastHealth) {
        bar.classList.add('damage-effect');
        setTimeout(() => bar.classList.remove('damage-effect'), 500);
      }
    }
    player._lastHealth = player.health;
    logHealthBarState(player);
  } catch (e) {
    console.warn('[healthBar] Update error:', e);
  }
}

function showHealthBars() {
  const container = getHealthBarContainer();
  if (container) container.style.display = 'flex';
}

function hideHealthBars() {
  const container = getHealthBarContainer();
  if (container) container.style.display = 'none';
}

// --- Animated Score/Combo Popups ---
function showScorePopup(playerIdx, value, type = 'score') {
  const bar = getHealthBarEl(playerIdx);
  if (!bar) return;
  let popup = document.createElement('span');
  popup.className = `score-popup ${type}`;
  let text = '';
  if (type === 'combo') {
    text = 'Combo! +' + value;
  } else if (value > 0) {
    text = '+' + value;
  } else {
    text = value;
  }
  popup.textContent = text;
  bar.appendChild(popup);
  setTimeout(() => {
    popup.classList.add('fade');
    setTimeout(() => popup.remove(), 600);
  }, 10);
}

// --- Tooltip Support for Health Bars ---
function attachHealthBarTooltips() {
  HEALTH_BAR_IDS.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-describedby', `healthBarTooltip${idx}`);
    let tooltip = document.createElement('span');
    tooltip.className = 'health-bar-tooltip';
    tooltip.id = `healthBarTooltip${idx}`;
    tooltip.textContent = HEALTH_LABELS[idx];
    el.appendChild(tooltip);
    el.addEventListener('focus', () => tooltip.classList.add('show'));
    el.addEventListener('blur', () => tooltip.classList.remove('show'));
    el.addEventListener('mouseenter', () => tooltip.classList.add('show'));
    el.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
  });
}

// --- Winner/Loser Effects ---
function setWinnerLoserEffect(winnerIdx, loserIdx) {
  HEALTH_BAR_IDS.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('winner', 'loser');
    if (idx === winnerIdx) el.classList.add('winner');
    if (idx === loserIdx) el.classList.add('loser');
  });
}

// --- Round Timer Bar ---
function updateRoundTimerBar(percent) {
  let timerBar = document.getElementById('roundTimerBar');
  if (!timerBar) {
    const container = getHealthBarContainer();
    if (!container) return;
    timerBar = document.createElement('div');
    timerBar.id = 'roundTimerBar';
    timerBar.className = 'round-timer-bar';
    container.appendChild(timerBar);
  }
  timerBar.style.width = `${Math.max(0, Math.min(100, percent * 100))}%`;
}

// --- Visually Hidden Utility (for accessibility) ---
function visuallyHide(el) {
  if (el) el.classList.add('visually-hidden');
}
function visuallyShow(el) {
  if (el) el.classList.remove('visually-hidden');
}

// --- Integration: Attach tooltips and clear effects on render ---
function renderHealthBars(players = []) {
  // Defensive: ensure DOM structure exists
  const container = getHealthBarContainer();
  if (!container) return;
  container.innerHTML = `
    <div id="player1HealthBar" class="health-bar player-1-health" role="progressbar" aria-label="Player 1 Health">
      <div id="player1HealthBarInner" class="health-bar-inner" aria-valuenow="100" aria-valuemax="100" aria-label="Player 1 Health"><span class="visually-hidden">Player 1 Health</span></div>
    </div>
    <div id="player2HealthBar" class="health-bar player-2-health" role="progressbar" aria-label="Player 2 Health">
      <div id="player2HealthBarInner" class="health-bar-inner" aria-valuenow="100" aria-valuemax="100" aria-label="Player 2 Health"><span class="visually-hidden">Player 2 Health</span></div>
    </div>
  `;
  // Initial update
  players.forEach(updateHealthBar);
  attachHealthBarTooltips();
  updateRoundTimerBar(1); // Full timer at start
}

// --- Enhanced Error Handling, Event Management, and Debugging ---
function safeGetHealthBarEl(playerIdx) {
  try {
    return getHealthBarEl(playerIdx);
  } catch (e) {
    console.warn(`[healthBar] safeGetHealthBarEl error for idx ${playerIdx}:`, e);
    return null;
  }
}

function safeGetHealthBarContainer() {
  try {
    return getHealthBarContainer();
  } catch (e) {
    console.warn('[healthBar] safeGetHealthBarContainer error:', e);
    return null;
  }
}

function safeUpdateHealthBar(player) {
  try {
    updateHealthBar(player);
  } catch (e) {
    console.warn('[healthBar] safeUpdateHealthBar error:', e);
  }
}

function safeShowScorePopup(playerIdx, value, type = 'score') {
  try {
    showScorePopup(playerIdx, value, type);
  } catch (e) {
    console.warn('[healthBar] safeShowScorePopup error:', e);
  }
}

function safeSetWinnerLoserEffect(winnerIdx, loserIdx) {
  try {
    setWinnerLoserEffect(winnerIdx, loserIdx);
  } catch (e) {
    console.warn('[healthBar] safeSetWinnerLoserEffect error:', e);
  }
}

function safeUpdateRoundTimerBar(percent) {
  try {
    updateRoundTimerBar(percent);
  } catch (e) {
    console.warn('[healthBar] safeUpdateRoundTimerBar error:', e);
  }
}

// --- Robust Event Management: Custom Event Listeners ---
const healthBarEventListeners = {};
function onHealthBarEvent(eventType, listener) {
  if (typeof eventType !== 'string' || typeof listener !== 'function') return;
  if (!healthBarEventListeners[eventType]) healthBarEventListeners[eventType] = [];
  healthBarEventListeners[eventType].push(listener);
}
function offHealthBarEvent(eventType, listener) {
  if (!healthBarEventListeners[eventType]) return;
  healthBarEventListeners[eventType] = healthBarEventListeners[eventType].filter(l => l !== listener);
}
function fireHealthBarEvent(eventType, detail) {
  if (healthBarEventListeners[eventType]) {
    healthBarEventListeners[eventType].forEach(listener => {
      try { listener(detail); } catch (e) { console.error(`[healthBar] Error in custom event listener for ${eventType}:`, e); }
    });
  }
}
function dispatchHealthBarEvent(eventType, detail = {}) {
  try {
    fireHealthBarEvent(eventType, detail);
    if (window?.DEBUG_MODE) console.debug(`[healthBar] Dispatched event: ${eventType}`, detail);
  } catch (e) {
    console.error(`[healthBar] Error dispatching event (${eventType}):`, e);
  }
}

// --- Debug: Expose healthBar state and API for inspection ---
window.healthBarDebug = {
  getHealthBarEl,
  getHealthBarContainer,
  updateHealthBar,
  renderHealthBars,
  showHealthBars,
  hideHealthBars,
  getHealthPercent,
  resetHealthBars,
  logHealthBarState,
  ensureHealthBarDOM,
  showScorePopup,
  setWinnerLoserEffect,
  updateRoundTimerBar,
  visuallyHide,
  visuallyShow,
  onHealthBarEvent,
  offHealthBarEvent,
  dispatchHealthBarEvent,
  healthBarEventListeners
};

// Event-driven updates
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('playerHit', ({ defender }) => updateHealthBar(defender));
  eventManager.subscribe('playerHealed', ({ player }) => updateHealthBar(player));
  eventManager.subscribe('fightStart', ({ players }) => {
    renderHealthBars(players);
    showHealthBars();
  });
  eventManager.subscribe('fightEnd', () => hideHealthBars());
  eventManager.subscribe('playerDefeated', ({ winner, loser }) => {
    if (winner && loser && winner.playerIndex !== undefined && loser.playerIndex !== undefined) {
      setWinnerLoserEffect(winner.playerIndex, loser.playerIndex);
    }
  });
  eventManager.subscribe('fightStart', () => clearWinnerLoserEffect());
  eventManager.subscribe('scorePopup', ({ playerIdx, value, type }) => showScorePopup(playerIdx, value, type));
  eventManager.subscribe('comboPopup', ({ playerIdx, value }) => showScorePopup(playerIdx, value, 'combo'));
  eventManager.subscribe('winnerLoser', ({ winnerIdx, loserIdx }) => setWinnerLoserEffect(winnerIdx, loserIdx));
  eventManager.subscribe('roundTimer', ({ percent }) => updateRoundTimerBar(percent));
}

// --- UI Integration: Expose healthBar API for other UI modules ---
window.healthBarUI = {
  updateHealthBar: safeUpdateHealthBar,
  renderHealthBars,
  showHealthBars,
  hideHealthBars,
  getHealthPercent,
  resetHealthBars,
  logHealthBarState,
  ensureHealthBarDOM,
  showScorePopup: safeShowScorePopup,
  setWinnerLoserEffect: safeSetWinnerLoserEffect,
  updateRoundTimerBar: safeUpdateRoundTimerBar,
  visuallyHide,
  visuallyShow,
  onHealthBarEvent,
  offHealthBarEvent,
  dispatchHealthBarEvent
};

// Export core health bar API for external modules
export { updateHealthBar, showHealthBars, hideHealthBars };