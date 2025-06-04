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
import { gameContext } from './game/gameContext.js';
import { onScreenStateChange, updateScreenOverlays, setScreenState } from './ui/screenManager.js';

// Expose the central event manager globally for UI scripts
window.eventManager = eventManager;

// --- UI/DOM Bootstrapping with Error Handling, Event Management, and Debugging ---
window.addEventListener('DOMContentLoaded', () => {
  try {
    let paused = false;
    setScreenState('MENU');
    updateScreenOverlays();
    onScreenStateChange(updateScreenOverlays);
    eventManager.subscribe('showMenu', ({ state }) => setScreenState(state || 'MENU'));
    // Step 4: On Start Game button click (menuStart), call setScreenState('PLAYING') before starting the game loop
    eventManager.subscribe('menuStart', () => {
      setScreenState('PLAYING');
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
      let lastTime = performance.now();
      function frame(time) {
        const delta = time - lastTime;
        lastTime = time;
        if (canvas) {
          const ctx = canvas.getContext('2d');
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
    // Step 5: On 'pause', call setScreenState('PAUSED')
    eventManager.subscribe('pause', () => { paused = true; setScreenState('PAUSED'); });
    // Step 6: On 'resume', call setScreenState('PLAYING')
    eventManager.subscribe('resume', () => { paused = false; setScreenState('PLAYING'); });
    // Step 7: On 'gameOver', call setScreenState('END')
    eventManager.subscribe('gameOver', () => setScreenState('END'));
    // Step 8: On 'fightStart', call setScreenState('PLAYING')
    eventManager.subscribe('fightStart', () => setScreenState('PLAYING'));
    // Step 9: On 'fightEnd', call setScreenState('END')
    eventManager.subscribe('fightEnd', () => setScreenState('END'));
    // Step 10: On 'menuMainMenu', call setScreenState('MENU')
    eventManager.subscribe('menuMainMenu', () => setScreenState('MENU'));
    // Step 11: On settings menu open, call setScreenState('SETTINGS_MENU')
    eventManager.subscribe('settingsMenu', () => setScreenState('SETTINGS_MENU'));
    // Step 12: ESC key handler toggles PAUSED/PLAYING using setScreenState
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!paused) {
          eventManager.dispatchEvent('pause');
          setScreenState('PAUSED');
          window.menuUI?.updateMenuState('PAUSED');
        } else {
          eventManager.dispatchEvent('resume');
          setScreenState('PLAYING');
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
    // Step 3: On 'showMenu', call setScreenState(state) to ensure all menu transitions are routed through the manager
    eventManager.subscribe('showMenu', ({ state }) => setScreenState(state || 'MENU'));
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