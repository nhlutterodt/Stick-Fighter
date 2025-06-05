// bootstrap.js - Centralized wiring for Stick Fighter
import { preloadAssets } from './game/preloader.js';
import { setupResponsiveCanvas } from './game/canvasManager.js';
import { loadGameState } from './game/saveManager.js';
import { eventManager } from './game/eventManager.js';
import gameContext, { setMenuState, registerSystem, broadcastGameEvent, logDiagnostic } from './game/gameContext.js';
import { initControls, onControlsChanged } from './game/controls.js';
import obstaclesMod from './game/obstacles.js';
import * as stickmanMod from './game/stickman.js';
import * as aiMod from './game/ai.js';
import * as powerupsMod from './game/powerups.js';

window.eventManager    = eventManager;
window.gameContext     = gameContext;
window.setMenuState    = setMenuState;
window.registerSystem  = registerSystem;
window.broadcastGameEvent = broadcastGameEvent;
window.logDiagnostic   = logDiagnostic;

// Preload assets and then start the game
const loadingEl = document.createElement('div');
loadingEl.id = 'loadingOverlay';
loadingEl.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white text-lg z-50';
loadingEl.innerText = 'Loading… 0%';
document.body.appendChild(loadingEl);

preloadAssets((loaded, total) => {
  loadingEl.innerText = `Loading… ${Math.floor((loaded/total)*100)}%`;
})
  .then(assets => {
    window.gameAssets = Object.fromEntries(assets.map(a => [a.key, a.data]));
    document.body.removeChild(loadingEl);
    // Responsive canvas
    setupResponsiveCanvas('gameCanvas', 800, 400);
    // Restore game state if available
    const saved = loadGameState();
    if (saved) {
      window.eventManager?.dispatchEvent('restoreGame', saved);
    }
    // Wire controls
    initControls();
    // Expose submodules
    window.stickman  = stickmanMod;
    window.controls  = { initControls, onControlsChanged };
    window.ai        = aiMod;
    window.obstacles = obstaclesMod;
    window.powerups  = powerupsMod;
    // Fire “app ready” so UI can show an initial message
    window.dispatchEvent(new Event('stickFighterAppReady'));
    // Dynamically import main entrypoint
    import('./index.js');
  })
  .catch(err => {
    console.error('Asset preload failed:', err);
    loadingEl.innerText = 'Failed to load resources. Check console.';
  });
