import { gameContext, registerSystem, logDiagnostic } from './gameContext.js';
import { eventManager } from './eventManager.js';
import { updateAllAIControllers } from './ai.js';
import { updateAllObstacles } from './obstacles.js';
import { updateAllPowerUps } from './powerups.js';
import { updateAllHitSparks } from './hitSparks.js';

// Register core systems in the shared context for cross-module access
registerSystem('eventManager', eventManager);
registerSystem('aiControllers', gameContext.aiControllers);
registerSystem('obstacles', gameContext.obstacles);
registerSystem('powerups', gameContext.powerups);
registerSystem('hitSparks', gameContext.hitSparks);
// Register other systems as needed

// Unified, extensible game loop with event and debug/diagnostic hooks
export function integratedGameLoop(delta, contextOverrides = {}) {
  // Merge context for this frame
  const context = { ...gameContext, ...contextOverrides };
  // Update all systems
  updateAllAIControllers?.(delta, context);
  updateAllObstacles?.(delta, context);
  updateAllPowerUps?.(delta, context);
  updateAllHitSparks?.(delta, context);
  // ...update other systems as needed...
  // Diagnostics/analytics hook
  logDiagnostic('frame', { time: Date.now(), context });
  // Broadcast frame event for plugins/analytics/debug tools
  eventManager?.dispatchEvent('frame', { delta, context });
}

// Debug framework: listen for debug events and log them
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('diagnostic', ({ event, data }) => {
    // You can enhance this to route to a debug UI, overlay, or remote logger
    if (window?.DEBUG_MODE) {
      console.debug(`[DIAGNOSTIC] ${event}:`, data);
    }
  });
  eventManager.subscribe('frame', ({ delta, context }) => {
    if (window?.DEBUG_MODE && window?.DEBUG_FRAME_LOG) {
      console.debug(`[FRAME] delta=${delta}`, context);
    }
  });
}