// obstacles.js - Modular, extensible obstacle system for Stick Fighter
// Author: Modularized & enhanced from original monolithic code

import { eventManager } from './eventManager.js';

/**
 * Represents a static rectangular obstacle (platform, wall, etc).
 * @class
 */
export class Obstacle {
  /**
   * @param {number} x - X position (top-left)
   * @param {number} y - Y position (top-left)
   * @param {number} width - Width of the obstacle
   * @param {number} height - Height of the obstacle
   * @param {string} [color="#8D6E63"] - Fill color
   * @param {object} [options] - Extensibility for future types
   */
  constructor(x, y, width, height, color = '#8D6E63', options = {}) {
    try {
      if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
        throw new TypeError('Obstacle: x, y, width, and height must be numbers');
      }
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.color = color;
      this.type = options.type || 'static';
      this.options = options;
      this.id = options.id || `obstacle_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      this.debug = options.debug || false;
      this.retryCount = 0;
      this.maxRetries = options.maxRetries || 2;
    } catch (err) {
      this.handleError(err, 'constructor');
    }
  }

  /**
   * Draws the obstacle on the provided canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    let attempts = 0;
    while (attempts <= this.maxRetries) {
      try {
        if (!ctx) throw new Error('Obstacle.draw: ctx is required');
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        if (this.debug) {
          ctx.strokeStyle = 'red';
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(this.x, this.y, this.width, this.height);
          ctx.setLineDash([]);
        }
        ctx.restore();
        break;
      } catch (err) {
        this.handleError(err, 'draw');
        attempts++;
        if (attempts > this.maxRetries) break;
      }
    }
  }

  /**
   * Returns an AABB for collision checks.
   */
  getAABB() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  /**
   * Checks if a point is inside this obstacle.
   * @param {number} px
   * @param {number} py
   * @returns {boolean}
   */
  containsPoint(px, py) {
    return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
  }

  /**
   * Checks if this obstacle overlaps with another AABB.
   * @param {object} rect - {x, y, width, height}
   * @returns {boolean}
   */
  overlaps(rect) {
    return rectsOverlap(this.getAABB(), rect);
  }

  /**
   * Allows dynamic color change (e.g., for hit feedback).
   * @param {string} color
   */
  setColor(color) {
    try {
      if (typeof color !== 'string') throw new TypeError('Obstacle.setColor: color must be a string');
      this.color = color;
    } catch (err) {
      this.handleError(err, 'setColor');
    }
  }

  /**
   * Allows moving the obstacle (for future moving platforms).
   * @param {number} dx
   * @param {number} dy
   */
  move(dx, dy) {
    try {
      if (typeof dx !== 'number' || typeof dy !== 'number') throw new TypeError('Obstacle.move: dx and dy must be numbers');
      this.x += dx;
      this.y += dy;
    } catch (err) {
      this.handleError(err, 'move');
    }
  }

  /**
   * Returns a shallow clone of this obstacle.
   */
  clone() {
    return new Obstacle(this.x, this.y, this.width, this.height, this.color, { ...this.options, id: undefined });
  }

  /**
   * Returns a debug string for diagnostics.
   */
  toString() {
    return `Obstacle(${this.x},${this.y},${this.width},${this.height},${this.color},id=${this.id})`;
  }

  /**
   * Returns a detailed description of this obstacle for AI, UI, or debugging.
   * @returns {object}
   */
  describe() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.color,
      options: { ...this.options },
      area: this.width * this.height,
      aspectRatio: this.width / (this.height || 1),
      isWide: this.width > this.height,
      isTall: this.height > this.width,
      isSquare: Math.abs(this.width - this.height) < 2,
      // Useful for stickman AI:
      top: this.y,
      bottom: this.y + this.height,
      left: this.x,
      right: this.x + this.width,
      center: { x: this.x + this.width / 2, y: this.y + this.height / 2 },
      debug: this.debug,
      canClimb: !!this.options.canClimb,
      canDestroy: !!this.options.canDestroy,
      canJumpOver: !!this.options.canJumpOver,
      // Add more as needed for AI/UX
    };
  }

  handleError(err, method) {
    if (!this.errorLog) this.errorLog = [];
    const errorMsg = `[Obstacle:${this.id}] Error in ${method}: ${err.message}`;
    this.errorLog.push({ time: Date.now(), method, error: err });
    if (this.debug) {
      // Optionally, dispatch error event for diagnostics
      eventManager?.dispatchEvent('obstacleError', { obstacle: this, method, error: err });
      // Log to console for devs
      console.error(errorMsg, err);
    }
  }
}

/**
 * Array to hold all obstacles in the game.
 */
export const obstacles = [];

/**
 * Adds an obstacle to the game and dispatches an event.
 * @param {Obstacle} obstacle
 */
export function addObstacle(obstacle) {
  let attempts = 0;
  while (attempts <= (obstacle?.maxRetries || 2)) {
    try {
      if (!(obstacle instanceof Obstacle)) throw new TypeError('addObstacle: argument must be an Obstacle');
      obstacles.push(obstacle);
      eventManager.dispatchEvent('obstacleAdded', { obstacle });
      break;
    } catch (err) {
      obstacle?.handleError?.(err, 'addObstacle');
      attempts++;
      if (attempts > (obstacle?.maxRetries || 2)) break;
    }
  }
}

// --- Obstacle Destroyed Event System ---
const obstacleDestroyedListeners = [];

/**
 * Register a callback to be invoked when an obstacle is destroyed.
 * @param {function} listener - Function to call with the destroyed obstacle as argument
 */
export function onObstacleDestroyed(listener) {
  if (typeof listener === 'function') {
    obstacleDestroyedListeners.push(listener);
  }
}

/**
 * Removes an obstacle by id.
 * @param {string} id
 */
export function removeObstacleById(id) {
  let attempts = 0;
  while (attempts <= 2) {
    try {
      const idx = obstacles.findIndex(o => o.id === id);
      if (idx !== -1) {
        const [removed] = obstacles.splice(idx, 1);
        eventManager.dispatchEvent('obstacleRemoved', { obstacle: removed });
        // Notify listeners
        for (const cb of obstacleDestroyedListeners) {
          try { cb(removed); } catch (e) { console.warn('[obstacles] ObstacleDestroyed listener error:', e); }
        }
        return removed;
      }
      return null;
    } catch (err) {
      attempts++;
      eventManager?.dispatchEvent('obstacleError', { method: 'removeObstacleById', error: err });
      console.error(`[Obstacle] Error in removeObstacleById: ${err.message}`, err);
      if (attempts > 2) break;
    }
  }
  return null;
}

/**
 * Clears all obstacles.
 */
export function clearObstacles() {
  try {
    obstacles.length = 0;
    eventManager.dispatchEvent('obstaclesCleared');
  } catch (err) {
    eventManager?.dispatchEvent('obstacleError', { method: 'clearObstacles', error: err });
    console.error(`[Obstacle] Error in clearObstacles: ${err.message}`, err);
  }
}

/**
 * Checks for AABB collision between a rect and any obstacle.
 * @param {object} rect - {x, y, width, height}
 * @returns {Obstacle|null}
 */
export function checkObstacleCollision(rect) {
  for (const obstacle of obstacles) {
    if (rectsOverlap(rect, obstacle.getAABB())) {
      return obstacle;
    }
  }
  return null;
}

/**
 * Utility: Checks if two rectangles overlap (AABB).
 */
export function rectsOverlap(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * Debug: Draw all obstacles with debug info.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawAllObstacles(ctx) {
  for (const obstacle of obstacles) {
    obstacle.draw(ctx);
  }
}

/**
 * Finds the first obstacle at a given point.
 * @param {number} x
 * @param {number} y
 * @returns {Obstacle|null}
 */
export function getObstacleAtPoint(x, y) {
  return obstacles.find(o => o.containsPoint(x, y)) || null;
}

/**
 * Returns all obstacles overlapping a given rect.
 * @param {object} rect - {x, y, width, height}
 * @returns {Obstacle[]}
 */
export function getObstaclesInRect(rect) {
  return obstacles.filter(o => o.overlaps(rect));
}

/**
 * Returns the obstacle with the given id.
 * @param {string} id
 * @returns {Obstacle|null}
 */
export function getObstacleById(id) {
  return obstacles.find(o => o.id === id) || null;
}

/**
 * Replace all obstacles with a new set (for level loading).
 * @param {Obstacle[]} newObstacles
 */
export function setObstacles(newObstacles) {
  try {
    clearObstacles();
    for (const o of newObstacles) obstacles.push(o);
    eventManager.dispatchEvent('obstaclesSet', { obstacles });
  } catch (err) {
    eventManager?.dispatchEvent('obstacleError', { method: 'setObstacles', error: err });
    console.error(`[Obstacle] Error in setObstacles: ${err.message}`, err);
  }
}

/**
 * Toggle debug mode for all obstacles.
 * @param {boolean} debug
 */
export function setObstaclesDebug(debug) {
  for (const o of obstacles) o.debug = debug;
}

/**
 * Serialize all obstacles to a plain object array (for saving).
 * @returns {object[]}
 */
export function serializeObstacles() {
  return obstacles.map(o => ({ x: o.x, y: o.y, width: o.width, height: o.height, color: o.color, type: o.type, id: o.id }));
}

/**
 * Load obstacles from a plain object array (for loading).
 * @param {object[]} arr
 */
export function loadObstaclesFromArray(arr) {
  setObstacles(arr.map(obj => new Obstacle(obj.x, obj.y, obj.width, obj.height, obj.color, { type: obj.type, id: obj.id })));
}

/**
 * Returns a description object for every obstacle (for AI, UI, etc).
 * @returns {object[]}
 */
export function describeAllObstacles() {
  return obstacles.map(o => o.describe());
}

// Extensibility: Future obstacle types (moving, damaging, destructible) can extend Obstacle.
// Example:
// export class MovingObstacle extends Obstacle { ... }

// Diagnostics: Hook into eventManager for obstacle lifecycle events as needed.

// --- Integration: Register obstacle-related events and hooks ---
// Example: Listen for obstacle events for analytics, debugging, or UI feedback

eventManager?.subscribe?.('obstacleAdded', ({ obstacle }) => {
  // Optionally log or update UI
  if (obstacle.debug) console.log('[Obstacle] Added:', obstacle.toString());
});
eventManager?.subscribe?.('obstacleRemoved', ({ obstacle }) => {
  if (obstacle?.debug) console.log('[Obstacle] Removed:', obstacle?.toString?.());
});
eventManager?.subscribe?.('obstaclesCleared', () => {
  console.log('[Obstacle] All obstacles cleared');
});
eventManager?.subscribe?.('obstaclesSet', ({ obstacles }) => {
  console.log(`[Obstacle] Obstacles set (${obstacles.length})`);
});
eventManager?.subscribe?.('obstacleError', ({ obstacle, method, error }) => {
  console.error(`[Obstacle] Error in ${method}:`, error, obstacle);
});

// --- Integration with game loop and rendering ---
// Example: Use drawAllObstacles in the main render function
// In your main game loop or render function:
// drawAllObstacles(ctx);

/**
 * Update or draw all obstacles; called in the game loop.
 * @param {number} delta
 * @param {{ctx: CanvasRenderingContext2D}} context
 */
export function updateAllObstacles(delta, context) {
  const ctx = context?.ctx || (typeof document !== 'undefined' ? document.getElementById('gameCanvas')?.getContext('2d') : null);
  if (!ctx) return;
  // Draw static obstacles
  drawAllObstacles(ctx);
}

// --- Integration with controls and gameplay logic ---
// Example: Use checkObstacleCollision in player movement/collision logic
// if (checkObstacleCollision(playerRect)) { ... }

// --- Example: Add default obstacles at game start or level load ---
// setObstacles([
//   new Obstacle(200, 350, 120, 40),
//   new Obstacle(480, 340, 120, 60)
// ]);