// index.js - Modern entry point for Stick Fighter UI/game integration
// Loads and wires up all modular UI and game systems

import '../src/ui/controlsInfo.js';
import '../src/ui/healthBar.js';
import '../src/ui/menu.js';
import '../src/ui/messageDisplay.js';
import { integratedGameLoop } from './game/gameLoop.js';
import '../src/game/ai.js';
import '../src/game/controls.js';
import { eventManager } from './game/eventManager.js';
import '../src/game/hitSparks.js';
import '../src/game/obstacles.js';
import '../src/game/powerups.js';
import { Stickman } from './game/stickman.js';
import { setMenuState, gameContext } from './game/gameContext.js';

// Expose the central event manager globally for UI scripts
window.eventManager = eventManager;

// --- UI/DOM Bootstrapping with Error Handling, Event Management, and Debugging ---
window.addEventListener('DOMContentLoaded', () => {
  try {
    let paused = false;
    // Pause/resume handling
    eventManager.subscribe('pause', () => { paused = true; });
    eventManager.subscribe('resume', () => { paused = false; });
    // Initialize menu via central context and event bus
    setMenuState('MENU');
    // Setup canvas and game loop starter
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let lastTime = 0;
    // Start the game loop when menuStart is fired
    eventManager.subscribe('menuStart', () => {
      window.menuUI?.hideMenu();
      gameContext.players.length = 0;
      const canvas = document.getElementById('gameCanvas');
      // Create two stickman instances and set playerIndex
      const p1 = new Stickman(100, canvas.height - 50, {}, true, null, false);
      p1.playerIndex = 0;
      const p2 = new Stickman(canvas.width - 100, canvas.height - 50, {}, false, null, false);
      p2.playerIndex = 1;
      gameContext.players.push(p1, p2);
      eventManager.dispatchEvent('fightStart', { players: gameContext.players });
      lastTime = performance.now();
      function frame(time) {
        const delta = time - lastTime;
        lastTime = time;
        if (ctx) {
          // Clear and fill background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (!paused) {
            integratedGameLoop(delta, { ctx, canvasHeight: canvas.height });
          }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    // Keyboard shortcut to toggle pause/resume via Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!paused) {
          eventManager.dispatchEvent('pause');
          window.menuUI?.updateMenuState('PAUSED');
        } else {
          eventManager.dispatchEvent('resume');
          window.menuUI?.hideMenu();
        }
        paused = !paused;
      }
    });
    if (window.healthBarUI && window.healthBarUI.renderHealthBars) window.healthBarUI.renderHealthBars();
    if (window.controlsInfoUI && window.controlsInfoUI.renderControlsInfo) window.controlsInfoUI.renderControlsInfo();
    // Optionally show main menu or intro message
    if (window.messageDisplayUI && window.messageDisplayUI.showMessage) {
      window.messageDisplayUI.showMessage('Welcome to Stick Fighter!');
    }
    // Wire up reset button for parity with index.html
    const resetBtn = document.getElementById('resetButton');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        try {
          // Notify menu system to return to main menu
          eventManager.dispatchEvent('menuMainMenu', {});
          if (window.menuUI && window.menuUI.updateMenuState) window.menuUI.updateMenuState('MENU');
          if (window.healthBarUI && window.healthBarUI.hideHealthBars) window.healthBarUI.hideHealthBars();
          if (window.messageDisplayUI && window.messageDisplayUI.hideMessage) window.messageDisplayUI.hideMessage();
          const pauseMenu = document.getElementById('pauseMenuTitle');
          if (pauseMenu) pauseMenu.style.display = 'none';
          const settingsMenu = document.getElementById('settingsMenuTitle');
          if (settingsMenu) settingsMenu.style.display = 'none';
        } catch (e) {
          console.warn('[index.js] Error in resetButton handler:', e);
        }
      });
    }
    // Update health bars dynamically each frame
    eventManager.subscribe('frame', ({ context }) => {
      if (window.healthBarUI && Array.isArray(context.players)) {
        context.players.forEach(player => {
          try { window.healthBarUI.updateHealthBar(player); }
          catch (e) { console.error('[index.js] Error updating health bar on frame:', e); }
        });
      }
    });
    // Debug: Log successful boot
    if (window?.DEBUG_MODE) console.debug('[index.js] UI/game bootstrapped successfully');
    // Event: Custom event for app ready
    const appReadyEvent = new CustomEvent('stickFighterAppReady', { detail: { modules: window.stickFighterDebug } });
    window.dispatchEvent(appReadyEvent);
  } catch (e) {
    console.error('[index.js] Error during UI/game bootstrapping:', e);
    if (window.messageDisplayUI && window.messageDisplayUI.showMessage) {
      window.messageDisplayUI.showMessage('Critical error during startup. See console for details.', { critical: true, duration: 0 });
    }
  }
});

// --- Debug: Expose all UI modules for console inspection and add event hooks ---
window.stickFighterDebug = {
  menu: window.menuUI,
  healthBar: window.healthBarUI,
  controlsInfo: window.controlsInfoUI,
  messageDisplay: window.messageDisplayUI,
  onAppReady: (cb) => window.addEventListener('stickFighterAppReady', cb),
  triggerError: (msg = 'Manual test error') => { throw new Error(msg); }
};

// --- Global error handler for debugging ---
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message, e.error);
  if (window.messageDisplayUI && window.messageDisplayUI.showMessage) {
    window.messageDisplayUI.showMessage('A global error occurred. See console for details.', { critical: true, duration: 0 });
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Global Unhandled Promise Rejection]', e.reason);
  if (window.messageDisplayUI && window.messageDisplayUI.showMessage) {
    window.messageDisplayUI.showMessage('A promise error occurred. See console for details.', { critical: true, duration: 0 });
  }
});