// screenManager.js - Centralized screen/menu state manager for Stick Fighter
// Handles transitions and overlays for MENU, SETTINGS, PAUSED, PLAYING, END

import { eventManager } from '../game/eventManager.js';
import { gameContext } from '../game/gameContext.js';

export const SCREEN_STATES = {
  MENU: 'MENU',
  SETTINGS: 'SETTINGS_MENU',
  PAUSED: 'PAUSED',
  PLAYING: 'PLAYING',
  END: 'END'
};

let currentScreen = SCREEN_STATES.MENU;
const listeners = [];

export function getScreenState() {
  return currentScreen;
}

export function setScreenState(state) {
  if (!Object.values(SCREEN_STATES).includes(state)) return;
  currentScreen = state;
  // Sync with gameContext for global state
  if (gameContext) gameContext.menuState = state;
  listeners.forEach(fn => fn(state));
  eventManager?.dispatchEvent('screenStateChanged', { state });
}

export function onScreenStateChange(fn) {
  if (typeof fn === 'function') listeners.push(fn);
}

// Utility: show/hide overlays and canvas based on state
export function updateScreenOverlays() {
  const pauseMenu = document.getElementById('pauseMenuTitle');
  const settingsMenu = document.getElementById('settingsMenuTitle');
  const canvas = document.getElementById('gameCanvas');
  if (pauseMenu) pauseMenu.style.display = (currentScreen === SCREEN_STATES.PAUSED) ? 'block' : 'none';
  if (settingsMenu) settingsMenu.style.display = (currentScreen === SCREEN_STATES.SETTINGS) ? 'block' : 'none';
  // Hide canvas for menu/settings/end, show for playing/paused
  if (canvas) {
    if (currentScreen === SCREEN_STATES.PLAYING || currentScreen === SCREEN_STATES.PAUSED) {
      canvas.style.display = 'block';
    } else {
      canvas.style.display = 'none';
    }
  }
}

// Listen for state changes to update overlays
onScreenStateChange(updateScreenOverlays);

// Listen for relevant events to update state
if (eventManager) {
  eventManager.subscribe('pause', () => setScreenState(SCREEN_STATES.PAUSED));
  eventManager.subscribe('resume', () => setScreenState(SCREEN_STATES.PLAYING));
  eventManager.subscribe('showMenu', ({ state }) => setScreenState(state || SCREEN_STATES.MENU));
  eventManager.subscribe('gameOver', () => setScreenState(SCREEN_STATES.END));
  eventManager.subscribe('fightStart', () => setScreenState(SCREEN_STATES.PLAYING));
}
