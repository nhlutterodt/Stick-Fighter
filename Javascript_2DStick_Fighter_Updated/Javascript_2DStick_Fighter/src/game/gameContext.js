// gameContext.js - Centralized game state and integration bus
// Provides a shared context for all game modules and systems

import { eventManager } from './eventManager.js';

export const gameContext = {
  players: [],
  aiControllers: [],
  obstacles: [],
  powerups: [],
  hitSparks: [],
  eventManager,
  diagnostics: {},
  menuState: null, // Current menu state
  // Add more shared state as needed
};

// Utility to set and broadcast menu state across all modules
export function setMenuState(state) {
  gameContext.menuState = state;
  eventManager?.dispatchEvent('showMenu', { state });
}

// Utility to register a system/component in the context
export function registerSystem(name, ref) {
  gameContext[name] = ref;
  eventManager?.dispatchEvent('systemRegistered', { name, ref });
}

// Utility to broadcast a game-wide event
export function broadcastGameEvent(eventName, payload) {
  eventManager?.dispatchEvent(eventName, payload);
}

// Example: Hook for analytics/diagnostics
export function logDiagnostic(event, data) {
  if (!gameContext.diagnostics[event]) gameContext.diagnostics[event] = [];
  gameContext.diagnostics[event].push(data);
  eventManager?.dispatchEvent('diagnostic', { event, data });
}
