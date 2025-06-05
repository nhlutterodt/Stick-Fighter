// canvasManager.js - Responsive canvas setup for Stick Fighter
// Usage: import { setupResponsiveCanvas } from './canvasManager.js';

export function setupResponsiveCanvas(canvasId, baseWidth = 800, baseHeight = 400) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas with ID ${canvasId} not found.`);
  function resize() {
    // Calculate integer scale to maintain pixel fidelity
    const scale = Math.max(
      Math.floor(window.innerWidth / baseWidth),
      Math.floor(window.innerHeight / baseHeight)
    ) || 1;
    canvas.style.width  = `${baseWidth * scale}px`;
    canvas.style.height = `${baseHeight * scale}px`;
    // Keep internal resolution constant
    canvas.width  = baseWidth;
    canvas.height = baseHeight;
  }
  window.addEventListener('resize', resize);
  resize();
}
