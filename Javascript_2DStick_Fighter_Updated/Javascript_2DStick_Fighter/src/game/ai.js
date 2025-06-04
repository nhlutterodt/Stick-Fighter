// ai.js - Modular, extensible AI system for Stick Fighter
// Author: Modularized & enhanced for ES module architecture

import { gameContext, registerSystem, logDiagnostic } from './gameContext.js';
import { eventManager } from './eventManager.js';

/**
 * AI Behavior Registry for extensibility
 */
export const AI_BEHAVIORS = Object.create(null);

/**
 * Allow dynamic injection of additional behavior registries (for plugins/expansion)
 */
const _behaviorRegistries = [AI_BEHAVIORS];
export function injectBehaviorRegistry(registry) {
  if (registry && typeof registry === 'object' && !_behaviorRegistries.includes(registry)) {
    _behaviorRegistries.push(registry);
  }
}
function getBehaviorFnFromRegistries(name) {
  for (const reg of _behaviorRegistries) {
    if (reg[name]) return reg[name];
  }
  return undefined;
}

export function registerAIBehavior(name, behaviorFn) {
  if (!name || typeof behaviorFn !== 'function') throw new Error('registerAIBehavior: Invalid arguments');
  AI_BEHAVIORS[name] = behaviorFn;
  eventManager?.dispatchEvent('aiBehaviorRegistered', { name });
}

export function unregisterAIBehavior(name) {
  if (AI_BEHAVIORS[name]) {
    delete AI_BEHAVIORS[name];
    eventManager?.dispatchEvent('aiBehaviorUnregistered', { name });
  }
}

/**
 * AIController plugin system for extensibility
 */
class AIPlugin {
  // Base plugin class for type checking and docs
  onAttach(ai) {}
  onDetach(ai) {}
  onUpdate(ai, delta, context) {}
  onEvent(ai, eventName, payload) {}
}

/**
 * AIController class for managing AI on a stickman/enemy
 * Now supports plugin system and per-instance event hooks
 */
export class AIController {
  /**
   * @param {object} entity - The stickman/enemy instance
   * @param {string} behavior - The name of the registered AI behavior
   * @param {object} options - Custom options for this AI
   */
  constructor(entity, behavior = 'basic', options = {}) {
    this.entity = entity;
    this.behavior = behavior;
    this.options = { ...options };
    this.state = {};
    // Initialize AIController runtime properties
    this.debug = options.debug || false;
    this.lastDecision = 0;
    this.decisionInterval = options.decisionInterval || 100; // ms
    this.active = true;
    this.plugins = [];
    this.eventHooks = Object.create(null);

    // Register this AIController instance in shared context
    gameContext.aiControllers.push(this);
    addAIController(this);
    eventManager?.dispatchEvent('aiControllerCreated', { ai: this });
    // Also add to module-level AI list
    aiControllers.push(this);
  }

  /**
   * Attach a plugin (must implement AIPlugin interface)
   */
  attachPlugin(plugin) {
    if (plugin && typeof plugin === 'object' && !this.plugins.includes(plugin)) {
      this.plugins.push(plugin);
      plugin.onAttach?.(this);
    }
  }
  /**
   * Detach a plugin
   */
  detachPlugin(plugin) {
    const idx = this.plugins.indexOf(plugin);
    if (idx !== -1) {
      this.plugins.splice(idx, 1);
      plugin.onDetach?.(this);
    }
  }
  /**
   * Add a per-instance event hook
   */
  addEventHook(eventName, fn) {
    if (!this.eventHooks[eventName]) this.eventHooks[eventName] = [];
    this.eventHooks[eventName].push(fn);
  }
  /**
   * Remove a per-instance event hook
   */
  removeEventHook(eventName, fn) {
    if (!this.eventHooks[eventName]) return;
    const idx = this.eventHooks[eventName].indexOf(fn);
    if (idx !== -1) this.eventHooks[eventName].splice(idx, 1);
  }
  /**
   * Call all event hooks for a given event
   */
  _callEventHooks(eventName, payload) {
    if (this.eventHooks[eventName]) {
      for (const fn of this.eventHooks[eventName]) {
        try { fn(payload, this); } catch (e) { if (this.debug) console.error('[AIController] Event hook error:', e); }
      }
    }
  }

  update(delta, context = {}) {
    if (!this.active) return;
    this.lastDecision += delta;
    if (this.lastDecision < this.decisionInterval) return;
    this.lastDecision = 0;
    // Merge context with options.context if provided
    const mergedContext = { ...context, ...(this.options.context || {}) };
    // Plugins can modify state or context before behavior
    for (const plugin of this.plugins) {
      try { plugin.onUpdate?.(this, delta, mergedContext); } catch (e) { if (this.debug) console.error('[AIController] Plugin update error:', e); }
    }
    const behaviorFn = getBehaviorFnFromRegistries(this.behavior);
    if (typeof behaviorFn === 'function') {
      try {
        behaviorFn(this.entity, this.state, mergedContext, this.options);
      } catch (err) {
        if (this.debug) console.error('[AIController] Behavior error:', err);
        eventManager?.dispatchEvent('aiError', { ai: this, error: err });
      }
    }
  }

  setBehavior(behavior) {
    if (getBehaviorFnFromRegistries(behavior)) {
      this.behavior = behavior;
      eventManager?.dispatchEvent('aiBehaviorChanged', { ai: this, behavior });
    }
  }

  stop() { this.active = false; }
  start() { this.active = true; }

  /**
   * Broadcast a custom event to this AIController (plugins and hooks)
   */
  onEvent(eventName, payload) {
    for (const plugin of this.plugins) {
      try { plugin.onEvent?.(this, eventName, payload); } catch (e) { if (this.debug) console.error('[AIController] Plugin event error:', e); }
    }
    this._callEventHooks(eventName, payload);
  }

  /**
   * Debug/diagnostic emitter for AIController
   */
  _emitDebug(event, data) {
    logDiagnostic(event, { ai: this, ...data });
    eventManager?.dispatchEvent('aiDebug', { event, ai: this, ...data });
  }
}

/**
 * Refactored AI behaviors to reduce cognitive complexity
 */
function findNearestEntity(entity, entities) {
  let nearest = null, minDist = Infinity;
  for (const e of entities) {
    if (e === entity) continue;
    const d = Math.hypot(e.x - entity.x, e.y - entity.y);
    if (d < minDist) { minDist = d; nearest = e; }
  }
  return { nearest, minDist };
}

function shouldJumpOverObstacle(entity, obstacles) {
  for (const obs of obstacles) {
    if (Math.abs(obs.x - entity.x) < 40 && Math.abs(obs.y - entity.y) < 30) {
      return true;
    }
  }
  return false;
}

function findNearestPowerup(entity, powerups) {
  let nearestPU = null, minDistPU = Infinity;
  for (const pu of powerups) {
    const d = Math.hypot(pu.x - entity.x, pu.y - entity.y);
    if (d < minDistPU) { minDistPU = d; nearestPU = pu; }
  }
  return { nearestPU, minDistPU };
}

registerAIBehavior('basic', (entity, state, context, options) => {
  const { players = [], obstacles = [], powerups = [] } = context;
  if (!entity || !players.length) return;
  const { nearest, minDist } = findNearestEntity(entity, players);
  if (!nearest) return;
  if (nearest.x < entity.x) entity.moveLeft?.();
  else if (nearest.x > entity.x) entity.moveRight?.();
  if (shouldJumpOverObstacle(entity, obstacles)) entity.jump?.();
  for (const pu of powerups) {
    if (Math.hypot(pu.x - entity.x, pu.y - entity.y) < 30) {
      entity.moveToward?.(pu.x, pu.y);
    }
  }
  if (minDist < 40) entity.attack?.();
});

registerAIBehavior('aggressive', (entity, state, context, options) => {
  const { players = [] } = context;
  if (!entity || !players.length) return;
  const { nearest, minDist } = findNearestEntity(entity, players);
  if (!nearest) return;
  if (nearest.x < entity.x) entity.moveLeft?.();
  else if (nearest.x > entity.x) entity.moveRight?.();
  if (minDist < 60) entity.attack?.();
});

registerAIBehavior('defensive', (entity, state, context, options) => {
  const { players = [], obstacles = [], powerups = [] } = context;
  if (!entity) return;
  const { nearest, minDist } = findNearestEntity(entity, players);
  if (nearest && minDist < 80) {
    if (nearest.x < entity.x) entity.moveRight?.();
    else entity.moveLeft?.();
  }
  const { nearestPU } = findNearestPowerup(entity, powerups);
  if (nearestPU) entity.moveToward?.(nearestPU.x, nearestPU.y);
  if (shouldJumpOverObstacle(entity, obstacles)) entity.jump?.();
});

/**
 * AI diagnostics and utilities
 */
export const aiDiagnostics = {
  getBehaviors: () => Object.keys(AI_BEHAVIORS),
  getBehaviorFn: (name) => AI_BEHAVIORS[name],
};

// Register AI system in the shared game context for global access and analytics
registerSystem('aiControllers', gameContext.aiControllers);

// --- Integration: register AI systems in context
registerSystem('AIController', AIController);
registerSystem('AI_BEHAVIORS', AI_BEHAVIORS);

// Listen for global game events to allow AI to react to cross-system events
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('powerupCollected', ({ player, powerup }) => {
    for (const ai of gameContext.aiControllers) {
      ai.onEvent('powerupCollected', { player, powerup });
    }
    logDiagnostic('aiPowerupReact', { player, powerup });
  });
  eventManager.subscribe('obstacleSpawned', ({ obstacle }) => {
    for (const ai of gameContext.aiControllers) {
      ai.onEvent('obstacleSpawned', { obstacle });
    }
    logDiagnostic('aiObstacleReact', { obstacle });
  });
  eventManager.subscribe('playerHit', ({ attacker, defender, damage }) => {
    for (const ai of gameContext.aiControllers) {
      ai.onEvent('playerHit', { attacker, defender, damage });
    }
    logDiagnostic('aiPlayerHitReact', { attacker, defender, damage });
  });
  // Add more event hooks as needed for advanced integration
}

// --- Integration: update all AIControllers in game loop ---
export const aiControllers = [];
export function addAIController(ai) {
  aiControllers.push(ai);
  eventManager?.dispatchEvent('aiControllerAdded', { ai });
}
export function removeAIController(ai) {
  const idx = aiControllers.indexOf(ai);
  if (idx !== -1) {
    aiControllers.splice(idx, 1);
    eventManager?.dispatchEvent('aiControllerRemoved', { ai });
  }
}
export function updateAllAIControllers(delta, context) {
  for (const ai of aiControllers) ai.update(delta, context);
}

// --- Utility and Robust Features for AI System ---

/**
 * Get all active AIControllers
 */
export function getActiveAIControllers() {
  // Use shared context array to ensure controllers are tracked
  return gameContext.aiControllers.filter(ai => ai.active);
}

/**
 * Get AIControllers by behavior
 * @param {string} behavior
 */
export function getAIControllersByBehavior(behavior) {
  return aiControllers.filter(ai => ai.behavior === behavior);
}

/**
 * Pause/resume all AIControllers (for game pause)
 */
let _aiPaused = false;
export function pauseAllAI() {
  if (_aiPaused) return;
  for (const ai of aiControllers) ai.stop();
  _aiPaused = true;
}
export function resumeAllAI() {
  if (!_aiPaused) return;
  for (const ai of aiControllers) ai.start();
  _aiPaused = false;
}
export function isAIPaused() {
  return _aiPaused;
}

/**
 * Remove all inactive AIControllers (manual cleanup)
 */
export function removeInactiveAIControllers() {
  for (let i = aiControllers.length - 1; i >= 0; i--) {
    if (!aiControllers[i].active) aiControllers.splice(i, 1);
  }
}

/**
 * Export/import AIControllers for save/load or replay
 * Only serializes minimal info (entity id, behavior, options, state)
 */
export function exportAIControllers() {
  return aiControllers.map(ai => ({
    entityId: ai.entity?.id,
    behavior: ai.behavior,
    options: { ...ai.options },
    state: { ...ai.state },
    active: ai.active
  }));
}
export function importAIControllers(arr, entityResolver) {
  // entityResolver: function(id) => entity instance
  aiControllers.length = 0;
  for (const data of arr) {
    const entity = entityResolver?.(data.entityId);
    if (entity) {
      const ai = new AIController(entity, data.behavior, data.options);
      ai.state = data.state;
      ai.active = data.active;
      aiControllers.push(ai);
    }
  }
}