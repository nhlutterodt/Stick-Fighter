/**
 * powerups.js - Advanced, extensible power-up system for Stick Fighter
 * Author: Modularized & enhanced from original monolithic code, further expanded for modern ES module architecture
 */

import { eventManager } from './eventManager.js';

/**
 * Power-up type registry for dynamic registration and extensibility
 */
export const POWERUP_TYPES = Object.create(null);

/**
 * Register a new power-up type
 * @param {string} type
 * @param {object} config { color, effect, description, rarity, stackable, icon, sound, ... }
 */
export function registerPowerUpType(type, config) {
  if (!type || typeof config !== 'object') throw new Error('registerPowerUpType: Invalid arguments');
  POWERUP_TYPES[type] = { ...config };
  eventManager?.dispatchEvent('powerupTypeRegistered', { type, config });
}

/**
 * Unregister a power-up type
 * @param {string} type
 */
export function unregisterPowerUpType(type) {
  if (POWERUP_TYPES[type]) {
    delete POWERUP_TYPES[type];
    eventManager?.dispatchEvent('powerupTypeUnregistered', { type });
  }
}

// --- Default power-up types ---
registerPowerUpType('health', {
  color: '#4CAF50',
  effect: (player, opts = {}) => { player.health = Math.min(player.health + (opts.amount || 20), player.maxHealth || 100); },
  description: 'Restores health.',
  rarity: 1,
  stackable: false,
  icon: 'plus',
});
registerPowerUpType('speed', {
  color: '#2196F3',
  effect: (player, opts = {}) => { player.addStatusEffect?.('speed', opts.duration || 5000); },
  description: 'Increases speed temporarily.',
  rarity: 2,
  stackable: true,
  icon: 'arrow',
});
registerPowerUpType('shield', {
  color: '#FFC107',
  effect: (player, opts = {}) => { player.addStatusEffect?.('shield', opts.duration || 4000); },
  description: 'Temporary shield.',
  rarity: 2,
  stackable: false,
  icon: 'shield',
});
registerPowerUpType('invincibility', {
  color: '#E91E63',
  effect: (player, opts = {}) => { player.addStatusEffect?.('invincible', opts.duration || 3000); },
  description: 'Become invincible for a short time.',
  rarity: 5,
  stackable: false,
  icon: 'star',
});
registerPowerUpType('doubleDamage', {
  color: '#9C27B0',
  effect: (player, opts = {}) => { player.addStatusEffect?.('doubleDamage', opts.duration || 4000); },
  description: 'Double attack damage.',
  rarity: 3,
  stackable: true,
  icon: 'sword',
});
registerPowerUpType('areaHeal', {
  color: '#00BCD4',
  effect: (player, opts = {}) => { if (opts.allPlayers) opts.allPlayers.forEach(p => p.health = Math.min(p.health + (opts.amount || 10), p.maxHealth || 100)); },
  description: 'Heals all players nearby.',
  rarity: 4,
  stackable: false,
  icon: 'heart',
});

/**
 * Power-up state machine
 */
export const PowerUpState = Object.freeze({
  IDLE: 'idle',
  FALLING: 'falling',
  COLLECTED: 'collected',
  EXPIRED: 'expired',
});

/**
 * PowerUp class with advanced features
 */
export class PowerUp {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {string} type
   * @param {object} options
   */
  constructor(x, y, radius, type = 'health', options = {}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.options = { ...options };
    const def = POWERUP_TYPES[type] || {};
    this.color = options.color || def.color || '#FFF';
    this.icon = options.icon || def.icon || null;
    this.active = true;
    this.spawnTime = Date.now();
    this.id = options.id || `powerup_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    this.effect = options.effect || def.effect;
    this.description = options.description || def.description || '';
    this.fallSpeed = options.fallSpeed || 2.5;
    this.lifetime = options.lifetime || 15000;
    this.debug = options.debug || false;
    this.rarity = options.rarity || def.rarity || 1;
    this.stackable = options.stackable ?? def.stackable ?? false;
    this.state = PowerUpState.FALLING;
    this.collectedBy = null;
    this.expired = false;
    this.visual = options.visual || null; // custom draw/animation
    this.sound = options.sound || def.sound || null;
    this.meta = { ...(def.meta || {}), ...(options.meta || {}) };
  }

  draw(ctx) {
    if (!ctx) throw new Error('PowerUp.draw: ctx is required');
    ctx.save();
    ctx.globalAlpha = this.active ? 1 : 0.5;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    // Icon or type-specific drawing
    if (typeof this.visual === 'function') {
      this.visual(ctx, this);
    } else if (this.icon === 'plus' || this.type === 'health') {
      ctx.beginPath();
      ctx.moveTo(this.x - this.radius / 2, this.y);
      ctx.lineTo(this.x + this.radius / 2, this.y);
      ctx.moveTo(this.x, this.y - this.radius / 2);
      ctx.lineTo(this.x, this.y + this.radius / 2);
      ctx.stroke();
    } else if (this.icon === 'arrow' || this.type === 'speed') {
      ctx.beginPath();
      ctx.moveTo(this.x - this.radius / 3, this.y);
      ctx.lineTo(this.x + this.radius / 3, this.y);
      ctx.stroke();
    } else if (this.icon === 'shield' || this.type === 'shield') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.6, Math.PI, 2 * Math.PI);
      ctx.lineTo(this.x + this.radius * 0.6, this.y);
      ctx.stroke();
    } else if (this.icon === 'star' || this.type === 'invincibility') {
      // Draw a simple star
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI / 10);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(0, -this.radius * 0.7);
        ctx.rotate(Math.PI / 5);
        ctx.lineTo(0, -this.radius * 0.3);
        ctx.rotate(Math.PI / 5);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  update(delta, canvasHeight) {
    if (!this.active || this.state !== PowerUpState.FALLING) return;
    this.y += this.fallSpeed * (delta / (1000 / 60));
    if (this.y - this.radius > canvasHeight) {
      this.active = false;
      this.state = PowerUpState.EXPIRED;
      this.expired = true;
      eventManager?.dispatchEvent('powerupExpired', { powerup: this });
    }
    if (Date.now() - this.spawnTime > this.lifetime) {
      this.active = false;
      this.state = PowerUpState.EXPIRED;
      this.expired = true;
      eventManager?.dispatchEvent('powerupExpired', { powerup: this });
    }
  }

  apply(player, opts = {}) {
    if (!this.active || this.state !== PowerUpState.FALLING) return;
    try {
      this.effect?.(player, opts);
      this.active = false;
      this.state = PowerUpState.COLLECTED;
      this.collectedBy = player;
      if (this.sound) this.playSound();
      eventManager?.dispatchEvent('powerupCollected', { powerup: this, player });
    } catch (err) {
      eventManager?.dispatchEvent('powerupError', { powerup: this, error: err });
      if (this.debug) console.error(`[PowerUp] Error applying effect:`, err);
    }
  }

  playSound() {
    if (typeof this.sound === 'function') {
      this.sound();
    } else if (typeof window !== 'undefined' && this.sound) {
      const audio = new window.Audio(this.sound);
      audio.play();
    }
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      radius: this.radius,
      color: this.color,
      icon: this.icon,
      active: this.active,
      state: this.state,
      description: this.description,
      options: { ...this.options },
      debug: this.debug,
      rarity: this.rarity,
      stackable: this.stackable,
      meta: { ...this.meta },
    };
  }

  static deserialize(data) {
    return new PowerUp(data.x, data.y, data.radius, data.type, data.options);
  }

  describe() {
    return this.serialize();
  }
}

/**
 * Power-up array and management
 */
export const powerUps = [];

export function addPowerUp(powerup) {
  if (!(powerup instanceof PowerUp)) throw new TypeError('addPowerUp: argument must be a PowerUp');
  powerUps.push(powerup);
  eventManager?.dispatchEvent('powerupAdded', { powerup });
}

export function removePowerUpById(id) {
  const idx = powerUps.findIndex(p => p.id === id);
  if (idx !== -1) {
    const [removed] = powerUps.splice(idx, 1);
    eventManager?.dispatchEvent('powerupRemoved', { powerup: removed });
    return removed;
  }
  return null;
}

export function clearPowerUps() {
  powerUps.length = 0;
  eventManager?.dispatchEvent('powerupsCleared');
}

export function updatePowerUps(delta, canvasHeight) {
  for (const pu of powerUps) pu.update(delta, canvasHeight);
}

export function drawAllPowerUps(ctx) {
  for (const pu of powerUps) pu.draw(ctx);
}

export function getPowerUpAtPoint(x, y) {
  return powerUps.find(pu => pu.active && Math.hypot(pu.x - x, pu.y - y) <= pu.radius) || null;
}

export function getActivePowerUps() {
  return powerUps.filter(pu => pu.active);
}

export function describeAllPowerUps() {
  return powerUps.map(pu => pu.describe());
}

export function getPowerUpsByType(type) {
  return powerUps.filter(pu => pu.type === type);
}

export function getPowerUpsByState(state) {
  return powerUps.filter(pu => pu.state === state);
}

export function spawnRandomPowerUp(x, y, radius = 16, options = {}) {
  // Weighted random by rarity
  const types = Object.entries(POWERUP_TYPES);
  const totalWeight = types.reduce((sum, [k, v]) => sum + (v.rarity || 1), 0);
  let r = Math.random() * totalWeight;
  for (const [type, def] of types) {
    r -= def.rarity || 1;
    if (r <= 0) {
      const pu = new PowerUp(x, y, radius, type, options);
      addPowerUp(pu);
      eventManager?.dispatchEvent('powerupSpawned', { powerup: pu });
      return pu;
    }
  }
  // fallback
  const pu = new PowerUp(x, y, radius, 'health', options);
  addPowerUp(pu);
  eventManager?.dispatchEvent('powerupSpawned', { powerup: pu });
  return pu;
}

export function serializeAllPowerUps() {
  return powerUps.map(pu => pu.serialize());
}

export function loadPowerUpsFromData(arr) {
  clearPowerUps();
  for (const data of arr) {
    addPowerUp(PowerUp.deserialize(data));
  }
}

// --- EventManager integration for diagnostics and analytics ---
eventManager?.subscribe?.('powerupAdded', ({ powerup }) => {
  if (powerup.debug) console.log('[PowerUp] Added:', powerup.describe());
});
eventManager?.subscribe?.('powerupRemoved', ({ powerup }) => {
  if (powerup?.debug) console.log('[PowerUp] Removed:', powerup?.describe?.());
});
eventManager?.subscribe?.('powerupCollected', ({ powerup, player }) => {
  console.log(`[PowerUp] Collected by player:`, powerup.describe(), player);
});
eventManager?.subscribe?.('powerupExpired', ({ powerup }) => {
  console.log('[PowerUp] Expired:', powerup.describe());
});
eventManager?.subscribe?.('powerupError', ({ powerup, error }) => {
  console.error('[PowerUp] Error:', error, powerup);
});
eventManager?.subscribe?.('powerupSpawned', ({ powerup }) => {
  if (powerup.debug) console.log('[PowerUp] Spawned:', powerup.describe());
});
eventManager?.subscribe?.('powerupTypeRegistered', ({ type, config }) => {
  console.log(`[PowerUp] Type registered: ${type}`, config);
});
eventManager?.subscribe?.('powerupTypeUnregistered', ({ type }) => {
  console.log(`[PowerUp] Type unregistered: ${type}`);
});

/**
 * Debug/diagnostics API
 */
export const powerUpDiagnostics = {
  getAll: () => [...powerUps],
  getActive: getActivePowerUps,
  getByType: getPowerUpsByType,
  getByState: getPowerUpsByState,
  describeAll: describeAllPowerUps,
  serializeAll: serializeAllPowerUps,
  count: () => powerUps.length,
};

// --- Integration with obstacles, stickman, controls, gameLoop ---
// Assumes these modules are imported in the main entry point (index.js or gameLoop.js)
// and that eventManager is the central event bus for all modules.

// Integration: Power-ups can interact with obstacles (e.g., spawn on obstacle destroyed)
import { onObstacleDestroyed } from './obstacles.js';
import { Stickman, getAllStickmen } from './stickman.js';
import { onComboPerformed } from './controls.js';

// Example: Spawn a random powerup when an obstacle is destroyed
if (typeof onObstacleDestroyed === 'function') {
  onObstacleDestroyed((obstacle) => {
    if (Math.random() < 0.5) {
      // 50% chance to spawn a powerup at obstacle's position
      spawnRandomPowerUp(obstacle.x, obstacle.y);
    }
  });
}

// Example: Power-up can affect all stickmen (areaHeal, etc.)
eventManager?.subscribe?.('powerupCollected', ({ powerup, player }) => {
  if (powerup.type === 'areaHeal') {
    const allPlayers = typeof getAllStickmen === 'function' ? getAllStickmen() : [player];
    powerup.effect?.(player, { allPlayers });
  }
});

// Example: Controls integration (combo triggers special powerup spawn)
if (typeof onComboPerformed === 'function') {
  onComboPerformed((combo, player) => {
    if (combo === 'ULTRA_COMBO') {
      spawnRandomPowerUp(player.x, player.y, 20, { type: 'invincibility', debug: true });
    }
  });
}

// Example: Stickman integration (powerup effect hooks)
if (Stickman?.prototype) {
  // Add a hook for stickman to auto-collect powerups on collision
  Stickman.prototype.checkPowerUpCollision = function() {
    const pu = getPowerUpAtPoint?.(this.x, this.y);
    if (pu?.active) {
      pu.apply(this);
      removePowerUpById(pu.id);
    }
  };
}

// Example: Game loop integration (update/draw powerups)
// In your main game loop (e.g., gameLoop.js), call:
//   updatePowerUps(delta, canvas.height);
//   drawAllPowerUps(ctx);
// And for each stickman: stickman.checkPowerUpCollision();

// --- End integration ---