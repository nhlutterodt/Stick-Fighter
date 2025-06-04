import { gameContext, registerSystem, logDiagnostic } from './gameContext.js';
import { eventManager } from './eventManager.js';
import { updateAllAIControllers } from './ai.js';
import { updateAllObstacles, drawAllObstacles } from './obstacles.js';
import { updateAllPowerUps, drawAllPowerUps } from './powerups.js';
import { updateAllHitSparks, drawAllHitSparks } from './hitSparks.js';
import { updateAllStickmen, getAllStickmen } from './stickman.js';
import { getScreenState } from '../ui/screenManager.js';

// Register core systems in the shared context for cross-module access
registerSystem('eventManager', eventManager);
registerSystem('aiControllers', gameContext.aiControllers);
registerSystem('obstacles', gameContext.obstacles);
registerSystem('powerups', gameContext.powerups);
registerSystem('hitSparks', gameContext.hitSparks);
// Register other systems as needed

// Unified, extensible game loop with event and debug/diagnostic hooks
let _gameOverTriggered = false;
export function integratedGameLoop(delta, contextOverrides = {}) {
  // Only run game logic if in PLAYING state
  if (getScreenState && getScreenState() !== 'PLAYING') return;

  // DEBUG: log each time game loop runs
  console.debug('[gameLoop] integratedGameLoop called, delta:', delta);
  // Merge context for this frame
  const context = { ...gameContext, ...contextOverrides };
  // Include delta time for systems that need it
  context.delta = delta;

  // Reset game over flag when menu is shown (new game)
  if (context.menuState === 'MENU' || context.menuState === 'END') {
    _gameOverTriggered = false;
  }
  // Update all systems
  updateAllAIControllers?.(delta, context);
  updateAllObstacles?.(delta, context);
  updateAllStickmen?.(delta, context);
  updateAllPowerUps?.(delta, context);
  updateAllHitSparks?.(delta, context);
  // Check for game over
  if (! _gameOverTriggered && Array.isArray(context.players) && context.players.length >= 2) {
    const [p1, p2] = context.players;
    if (p1.health <= 0 || p2.health <= 0) {
      _gameOverTriggered = true;
      const winner = p1.health > p2.health ? p1 : p2;
      const loser  = winner === p1 ? p2 : p1;
      eventManager.dispatchEvent('playerDefeated', { winner, loser });
      eventManager.dispatchEvent('gameOver', { winner, loser });
      // Notify end of fight for UI cleanup
      eventManager.dispatchEvent('fightEnd', { winner, loser });
    }
  }
  // Render all layers in order: obstacles, stickmen, hitSparks, powerups
  if (context.ctx) {
    drawAllObstacles(context.ctx);
    // Draw all stickman instances
    getAllStickmen().forEach(stickman => {
      try { stickman.draw(context.ctx); }
      catch (e) { console.error('[gameLoop] Error drawing stickman:', e); }
    });
    drawAllHitSparks(context.ctx);
    drawAllPowerUps(context.ctx);
  }
  // Diagnostics/analytics hook
  logDiagnostic('frame', { time: Date.now(), context });
  // Broadcast frame event for plugins/analytics/debug tools
  eventManager?.dispatchEvent('frame', { delta, context });
}

// Debug framework: listen for debug events and log them
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('diagnostic', ({ event, data }) => {
    // You can enhance this to route to a debug UI, overlay, or remote logger
    if (window?.DEBUG_MODE) {
      console.debug(`[DIAGNOSTIC] ${event}:`, data);
    }
  });
  eventManager.subscribe('frame', ({ delta, context }) => {
    if (window?.DEBUG_MODE && window?.DEBUG_FRAME_LOG) {
      console.debug(`[FRAME] delta=${delta}`, context);
    }
  });
}

// --- Advanced Integration Opportunities ---
// 1. UI and Game State Synchronization
import { updateHealthBar } from '../ui/healthBar.js';
import { showMessage } from '../ui/messageDisplay.js';
import { updateMenuState } from '../ui/menu.js';

// Listen for game events and update UI modules accordingly
if (eventManager && typeof eventManager.subscribe === 'function') {
  // Health bar updates
  eventManager.subscribe('playerHit', ({ defender }) => {
    updateHealthBar(defender);
  });
  eventManager.subscribe('playerHealed', ({ player }) => {
    updateHealthBar(player);
  });
  // Show messages for key events
  eventManager.subscribe('powerupCollected', ({ player, powerup }) => {
    showMessage(`${player.name || 'Player'} collected a ${powerup.type} powerup!`);
  });
  eventManager.subscribe('playerDefeated', ({ winner, loser }) => {
    showMessage(`${winner} defeated ${loser}!`);
    updateMenuState('end');
  });
  // Menu state for pause/resume
  eventManager.subscribe('pause', () => updateMenuState('pause'));
  eventManager.subscribe('resume', () => updateMenuState('resume'));
}

// 2. Dynamic Difficulty and Adaptive AI
import * as aiModule from './ai.js';
// Example: Adjust AI difficulty based on analytics
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('comboAchieved', ({ player, comboCount }) => {
    if (comboCount > 3) {
      for (const ai of aiModule.aiControllers) {
        ai.setBehavior('aggressive');
      }
    }
  });
  eventManager.subscribe('playerStreak', ({ player, streak }) => {
    if (streak > 2) {
      for (const ai of aiModule.aiControllers) {
        ai.setBehavior('defensive');
      }
    }
  });
}

// 3. Centralized Settings Propagation
import { applySettings } from '../ui/controlsInfo.js';
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('settingsChanged', ({ settings }) => {
    applySettings(settings);
    // Propagate to other systems as needed
  });
}