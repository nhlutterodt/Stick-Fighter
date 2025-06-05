// hitSparks.js - Modular, extensible hit spark/impact effect system for Stick Fighter
// Author: Modularized & enhanced for ES module architecture

import { eventManager } from './eventManager.js';
import {
  // no constants needed here, keep imports minimal
} from './constants.js';

/**
 * HitSparkType registry for extensibility (different visual/sound effects)
 */
export const HIT_SPARK_TYPES = Object.create(null);

// --- Advanced Features for 2D Fighting Game HitSparks ---

/**
 * 1. Directional and Impact-Based Effects
 * 2. Color/Style Customization by Move/Character
 * 3. Animated/Multi-Frame Sprites
 * 4. Screen Shake/Camera Effects
 * 5. Combo/Chain Reaction & Sound Layering
 */

// --- Sprite/animation frame cache (for animated sparks) ---
const _spriteCache = {};

/**
 * Register a hit spark type with advanced options
 * @param {string} type
 * @param {object} config
 *   - color, particleCount, duration, size, sound, style, spriteSheet, frames, animSpeed, screenShake, flash, slowMo, soundLayer, etc.
 */
export function registerHitSparkType(type, config) {
  if (!type || typeof config !== 'object') throw new Error('registerHitSparkType: Invalid arguments');
  HIT_SPARK_TYPES[type] = { ...config };
  if (config.spriteSheet && typeof window !== 'undefined') {
    // Preload sprite sheet if provided
    if (!_spriteCache[type]) {
      const img = new window.Image();
      img.src = config.spriteSheet;
      _spriteCache[type] = img;
    }
  }
  eventManager?.dispatchEvent('hitSparkTypeRegistered', { type, config });
}

export function unregisterHitSparkType(type) {
  if (HIT_SPARK_TYPES[type]) {
    delete HIT_SPARK_TYPES[type];
    eventManager?.dispatchEvent('hitSparkTypeUnregistered', { type });
  }
}

// Default hit spark types
registerHitSparkType('default', {
  color: '#fff',
  particleCount: 8,
  duration: 300,
  size: 8,
  sound: null,
});
registerHitSparkType('heavy', {
  color: '#ff0',
  particleCount: 16,
  duration: 500,
  size: 12,
  sound: null,
});
registerHitSparkType('critical', {
  color: '#f00',
  particleCount: 24,
  duration: 700,
  size: 16,
  sound: null,
});

/**
 * HitSpark class
 */
export class HitSpark {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} type
   * @param {object} options
   */
  constructor(x, y, type = 'default', options = {}) {
    // --- Core properties ---
    this.x = x;
    this.y = y;
    this.type = type;
    const def = HIT_SPARK_TYPES[type] || {};
    this.color = options.color || def.color || '#fff';
    this.particleCount = options.particleCount || def.particleCount || 8;
    this.duration = options.duration || def.duration || 300;
    this.size = options.size || def.size || 8;
    this.sound = options.sound || def.sound || null;
    this.spawnTime = Date.now();
    this.active = true;
    this.id = options.id || `hitspark_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    this.debug = options.debug || false;
    this.meta = { ...(def.meta || {}), ...(options.meta || {}) };
    // --- Advanced ---
    this.impact = options.impact || {};
    this.comboCount = options.comboCount || 1;
    this.spriteSheet = options.spriteSheet || def.spriteSheet || null;
    this.frames = options.frames || def.frames || null;
    this.animSpeed = options.animSpeed || def.animSpeed || 1;
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.style = options.style || def.style || null;
    this.move = options.move || def.move || null;
    this.character = options.character || def.character || null;
    // Particle creation with impact direction/force
    this.particles = this._createParticles();
    if (this.sound) this.playSound();
    eventManager?.dispatchEvent('hitSparkSpawned', { hitSpark: this });
  }

  _createParticles() {
    const particles = [];
    const impact = this.impact || {};
    let baseAngle = typeof impact.angle === 'number' ? impact.angle : null;
    let baseForce = typeof impact.force === 'number' ? impact.force : 1;
    let baseVx = typeof impact.vx === 'number' ? impact.vx : null;
    let baseVy = typeof impact.vy === 'number' ? impact.vy : null;
    for (let i = 0; i < this.particleCount; i++) {
      let angle = baseAngle !== null ? baseAngle + (Math.random() - 0.5) * Math.PI / 3 : (2 * Math.PI * i) / this.particleCount;
      let force = baseForce + Math.random() * 0.5;
      let vx = baseVx !== null ? baseVx + (Math.random() - 0.5) : Math.cos(angle) * force;
      let vy = baseVy !== null ? baseVy + (Math.random() - 0.5) : Math.sin(angle) * force;
      particles.push({
        x: this.x,
        y: this.y,
        vx,
        vy,
        alpha: 1,
        size: this.size * (0.7 + Math.random() * 0.6),
      });
    }
    return particles;
  }

  update(delta) {
    if (!this.active) return;
    const elapsed = Date.now() - this.spawnTime;
    if (elapsed > this.duration) {
      this.active = false;
      eventManager?.dispatchEvent('hitSparkExpired', { hitSpark: this });
      return;
    }
    // Animated sprite support
    if (this.frames && this.frames.length > 0) {
      this.frameElapsed += delta * this.animSpeed;
      if (this.frameElapsed > 1000 / 60) {
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        this.frameElapsed = 0;
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * (delta / (1000 / 60));
      p.y += p.vy * (delta / (1000 / 60));
      p.alpha -= 0.03 * (delta / (1000 / 60));
      if (p.alpha < 0) p.alpha = 0;
    }
  }

  draw(ctx) {
    if (!this.active || !ctx) return;
    ctx.save();
    // Animated sprite support
    if (this.spriteSheet && _spriteCache[this.type]) {
      // Draw sprite frame at each particle position
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;
        // Assume sprite sheet is a horizontal strip, frames equally sized
        const img = _spriteCache[this.type];
        const frameW = img.width / (this.frames?.length || 1);
        const frameH = img.height;
        const frameIdx = this.frames ? this.frames[this.frameIndex] : 0;
        ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, p.x - frameW/2, p.y - frameH/2, frameW, frameH);
      }
    } else {
      // Fallback: colored particles
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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
      x: this.x,
      y: this.y,
      type: this.type,
      color: this.color,
      particleCount: this.particleCount,
      duration: this.duration,
      size: this.size,
      sound: this.sound,
      spawnTime: this.spawnTime,
      active: this.active,
      debug: this.debug,
      meta: { ...this.meta },
    };
  }

  static deserialize(data) {
    return new HitSpark(data.x, data.y, data.type, data);
  }

  describe() {
    return this.serialize();
  }
}

export const hitSparks = [];

export function spawnHitSpark(x, y, type = 'default', options = {}) {
  // Directional/impact support
  const impact = options.impact || {};
  // Style/move/character override
  let styleType = type;
  if (options.style && HIT_SPARK_TYPES[options.style]) styleType = options.style;
  if (options.move && HIT_SPARK_TYPES[options.move]) styleType = options.move;
  if (options.character && HIT_SPARK_TYPES[options.character]) styleType = options.character;
  // Combo/chain escalation
  const comboCount = _trackCombo();
  // Camera/screen shake/flash/slowMo
  const sparkType = HIT_SPARK_TYPES[styleType] || HIT_SPARK_TYPES[type] || {};
  if (sparkType.screenShake || options.screenShake) {
    eventManager?.dispatchEvent('hitSparkCameraEffect', { effect: 'shake', strength: sparkType.screenShake || options.screenShake, combo: comboCount });
  }
  if (sparkType.flash || options.flash) {
    eventManager?.dispatchEvent('hitSparkCameraEffect', { effect: 'flash', color: sparkType.flash || options.flash });
  }
  if (sparkType.slowMo || options.slowMo) {
    eventManager?.dispatchEvent('hitSparkCameraEffect', { effect: 'slowMo', duration: sparkType.slowMo || options.slowMo });
  }
  // Sound layering for combos
  if (sparkType.soundLayer && comboCount > 1) {
    // Play layered/unique sound for combos
    if (typeof sparkType.soundLayer === 'function') {
      sparkType.soundLayer(comboCount);
    } else if (typeof window !== 'undefined' && sparkType.soundLayer) {
      const audio = new window.Audio(sparkType.soundLayer);
      audio.volume = Math.min(1, 0.5 + 0.1 * comboCount);
      audio.play();
    }
  }
  // Pass all options, including impact, style, animation, combo
  const hs = new HitSpark(x, y, styleType, { ...options, impact, comboCount });
  hitSparks.push(hs);
  return hs;
}

// --- Combo/chain tracking for sound/visual escalation ---
let _lastSparkTime = 0;
let _comboCount = 0;
const COMBO_WINDOW = 250; // ms

function _trackCombo() {
  const now = Date.now();
  if (now - _lastSparkTime < COMBO_WINDOW) {
    _comboCount++;
  } else {
    _comboCount = 1;
  }
  _lastSparkTime = now;
  return _comboCount;
}

/**
 * Debug/diagnostics API
 */
export const hitSparkDiagnostics = {
  getAll: () => [...hitSparks],
  describeAll: describeAllHitSparks,
  count: () => hitSparks.length,
};

// --- Utility and supporting features for hitSparks.js ---

/**
 * Get all active hit sparks
 */
export function getActiveHitSparks() {
  return hitSparks.filter(hs => hs.active);
}

/**
 * Get hit sparks by type
 * @param {string} type
 */
export function getHitSparksByType(type) {
  return hitSparks.filter(hs => hs.type === type);
}

/**
 * Get hit sparks within a region (bounding box)
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function getHitSparksInRegion(x, y, w, h) {
  return hitSparks.filter(hs =>
    hs.active &&
    hs.x >= x && hs.x <= x + w &&
    hs.y >= y && hs.y <= y + h
  );
}

/**
 * Batch spawn hit sparks (e.g., for multi-hit or area effects)
 * @param {Array<{x:number, y:number, type?:string, options?:object}>} sparks
 */
export function spawnHitSparksBatch(sparks) {
  return sparks.map(s => spawnHitSpark(s.x, s.y, s.type || 'default', s.options || {}));
}

/**
 * Pause/resume all hit sparks (for game pause)
 */
let _paused = false;
let _pauseTimestamps = new Map();
export function pauseHitSparks() {
  if (_paused) return;
  _paused = true;
  _pauseTimestamps.clear();
  for (const hs of hitSparks) {
    if (hs.active) _pauseTimestamps.set(hs.id, Date.now());
  }
}
export function resumeHitSparks() {
  if (!_paused) return;
  const now = Date.now();
  for (const hs of hitSparks) {
    if (_pauseTimestamps.has(hs.id)) {
      hs.spawnTime += now - _pauseTimestamps.get(hs.id);
    }
  }
  _paused = false;
  _pauseTimestamps.clear();
}
export function isHitSparksPaused() {
  return _paused;
}

/**
 * Remove all expired/inactive hit sparks (manual cleanup)
 */
export function removeInactiveHitSparks() {
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    if (!hitSparks[i].active) hitSparks.splice(i, 1);
  }
}

/**
 * Export/import hit sparks for save/load or replay
 */
export function exportHitSparks() {
  return hitSparks.map(hs => hs.serialize());
}
export function importHitSparks(arr) {
  clearHitSparks();
  for (const data of arr) {
    hitSparks.push(HitSpark.deserialize(data));
  }
}

/**
 * Attach hit sparks to a moving entity (e.g., trailing effect)
 * @param {object} entity - Must have x, y properties
 * @param {string} type
 * @param {object} options
 */
export function attachHitSparkToEntity(entity, type = 'default', options = {}) {
  if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') return null;
  return spawnHitSpark(entity.x, entity.y, type, options);
}

// --- Integration with advanced hitSparks features across all systems ---
import { onObstacleDestroyed } from './obstacles.js';
import { Stickman } from './stickman.js';
import { onComboPerformed } from './controls.js';

// 1. Obstacle integration: directional/impact-based hit sparks
if (typeof onObstacleDestroyed === 'function') {
  onObstacleDestroyed((obstacle, { hitter, impact } = {}) => {
    // Use hitter's velocity or impact info if available
    let angle = null, force = 1;
    if (impact && typeof impact.angle === 'number') angle = impact.angle;
    else if (hitter && typeof hitter.vx === 'number' && typeof hitter.vy === 'number') {
      angle = Math.atan2(hitter.vy, hitter.vx);
      force = Math.sqrt(hitter.vx * hitter.vx + hitter.vy * hitter.vy);
    }
    spawnHitSpark(
      obstacle.x,
      obstacle.y,
      'heavy',
      {
        impact: { angle, force },
        style: obstacle.type || undefined,
        screenShake: 8,
        debug: true
      }
    );
  });
}

// 2. PowerUp integration: style/color-based hit sparks
if (eventManager?.subscribe) {
  eventManager.subscribe('powerupCollected', ({ powerup, player }) => {
    spawnHitSpark(
      player.x,
      player.y,
      'default',
      {
        color: powerup.color,
        style: powerup.type,
        impact: { angle: -Math.PI / 2, force: 1.5 },
        flash: powerup.color,
        debug: true
      }
    );
  });
}

// 3. Stickman integration: move/character-based, directional, and combo hit sparks
if (Stickman?.prototype) {
  Stickman.prototype.spawnHitSparkOnHit = function(target, move, attackInfo = {}) {
    // move: string (e.g., 'firePunch'), attackInfo: { angle, force, character }
    spawnHitSpark(
      target.x,
      target.y,
      move || 'default',
      {
        impact: { angle: attackInfo.angle, force: attackInfo.force },
        style: move,
        character: this.characterName,
        screenShake: attackInfo.critical ? 12 : 0,
        slowMo: attackInfo.critical ? 200 : 0,
        debug: true
      }
    );
  };
}

// 4. Controls integration: combo/chain, style, and sound layering
if (typeof onComboPerformed === 'function') {
  onComboPerformed((combo, player, comboInfo = {}) => {
    // comboInfo: { move, angle, force, soundLayer }
    spawnHitSpark(
      player.x,
      player.y,
      comboInfo.move || 'critical',
      {
        impact: { angle: comboInfo.angle, force: comboInfo.force },
        style: combo,
        soundLayer: comboInfo.soundLayer,
        screenShake: 10 + (comboInfo.level || 0) * 2,
        flash: '#fff',
        slowMo: 150,
        debug: true
      }
    );
  });
}

// 5. Game loop/camera integration: subscribe to camera effect events
if (eventManager?.subscribe) {
  eventManager.subscribe('hitSparkCameraEffect', ({ effect, strength, color, duration, combo }) => {
    // Example: call camera/screen shake/flash/slowMo handlers here
    if (effect === 'shake' && typeof window !== 'undefined' && window.cameraShake) {
      window.cameraShake(strength || 8, combo);
    }
    if (effect === 'flash' && typeof window !== 'undefined' && window.screenFlash) {
      window.screenFlash(color || '#fff');
    }
    if (effect === 'slowMo' && typeof window !== 'undefined' && window.slowMo) {
      window.slowMo(duration || 100);
    }
  });
}
// --- End integration ---

// Auto-spawn hit sparks on damage events
if (eventManager?.subscribe) {
  eventManager.subscribe('playerHit', ({ defender, impact }) => {
    const x = impact?.x ?? defender.x;
    const y = impact?.y ?? defender.y - defender.height / 2;
    hitSparks.push(new HitSpark(x, y, impact?.type || 'default', { impact }));
  });
}

export function updateAllHitSparks(delta, context) {
  for (const hs of hitSparks) {
    hs.update(delta, context);
  }
  // Remove inactive hit sparks after update
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    if (!hitSparks[i].active) hitSparks.splice(i, 1);
  }
}

export function describeAllHitSparks() {
  return hitSparks.map(hs => hs.describe());
}
/**
 * Render all active hit sparks on the canvas
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawAllHitSparks(ctx) {
  for (const hs of hitSparks) {
    try { hs.draw(ctx); } catch (e) { console.error('[hitSparks] Error drawing hit spark:', e); }
  }
}