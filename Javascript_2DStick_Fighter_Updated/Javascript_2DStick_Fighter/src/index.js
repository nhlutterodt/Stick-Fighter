// index.js - Modern entry point for Stick Fighter UI/game integration
// Loads and wires up all modular UI and game systems

import '../src/ui/controlsInfo.js';
import '../src/ui/healthBar.js';
import '../src/ui/menu.js';
import '../src/ui/messageDisplay.js';
import '../src/game/gameLoop.js';
import '../src/game/gameContext.js';
import '../src/game/ai.js';
import '../src/game/controls.js';
import '../src/game/eventManager.js';
import '../src/game/hitSparks.js';
import '../src/game/obstacles.js';
import '../src/game/powerups.js';
import '../src/game/stickman.js';

// --- UI/DOM Bootstrapping with Error Handling, Event Management, and Debugging ---
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Defensive: ensure all UI modules are initialized
    if (window.menuUI && window.menuUI.renderMenu) window.menuUI.renderMenu();
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