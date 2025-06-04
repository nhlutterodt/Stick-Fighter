// controlsInfo.js - Modular, event-driven controls info UI for Stick Fighter
// Author: Modernized for ES module, accessibility, and advanced UI/UX

import { getKeyBindings } from '../game/controls.js';
import { eventManager } from '../game/eventManager.js';
import { onScreenStateChange } from './screenManager.js';

let container = null;
let tooltip = null;
let closeBtn = null;

const ACTION_LABELS = {
  left: 'Move Left',
  right: 'Move Right',
  jump: 'Jump',
  punch: 'Punch',
  kick: 'Kick',
  guard: 'Guard',
  slam: 'Slam',
  airDodge: 'Air Dodge',
  parry: 'Parry',
  run: 'Run',
  turn: 'Turn'
};

function createTooltip() {
  if (tooltip) return;
  tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
}

function showTooltip(text, target) {
  try {
    if (!tooltip) createTooltip();
    tooltip.textContent = text;
    tooltip.classList.add('visible');
    const rect = target.getBoundingClientRect();
    // Responsive positioning
    let left = rect.left + rect.width / 2;
    let top = rect.bottom + 8;
    // Prevent overflow
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width / 2 > window.innerWidth) left = window.innerWidth - tooltipRect.width / 2 - 8;
    if (left - tooltipRect.width / 2 < 0) left = tooltipRect.width / 2 + 8;
    if (top + tooltipRect.height > window.innerHeight) top = rect.top - tooltipRect.height - 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  } catch (e) {
    console.warn('[controlsInfo] Tooltip error:', e);
  }
}

function hideTooltip() {
  if (tooltip) tooltip.classList.remove('visible');
}

function handleKeyNav(e) {
  if (!container) return;
  const keys = Array.from(container.querySelectorAll('.control-key'));
  const current = document.activeElement;
  const idx = keys.indexOf(current);
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (idx !== -1) keys[(idx + 1) % keys.length].focus();
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (idx !== -1) keys[(idx - 1 + keys.length) % keys.length].focus();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    hideControlsInfo();
    e.preventDefault();
  }
}

function createCloseButton() {
  if (closeBtn) return closeBtn;
  closeBtn = document.createElement('button');
  closeBtn.className = 'controls-info-close';
  closeBtn.setAttribute('aria-label', 'Close controls info');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '8px';
  closeBtn.style.right = '12px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '1.5em';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.color = 'var(--theme-accent-dark, #2563eb)';
  closeBtn.addEventListener('click', hideControlsInfo);
  return closeBtn;
}

function renderControlsInfo() {
  try {
    if (!container) {
      container = document.createElement('section');
      container.className = 'controls-info';
      container.setAttribute('tabindex', '0');
      container.setAttribute('aria-label', 'Game Controls Information');
      container.setAttribute('role', 'region');
      container.style.position = 'relative';
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.4s';
      document.body.appendChild(container);
    }
    const bindings = getKeyBindings();
    if (!bindings || !bindings.player1 || !bindings.player2) throw new Error('Key bindings missing');
    container.innerHTML = `
      <h3>Controls</h3>
      <div style="display: flex; gap: 32px; flex-wrap: wrap; justify-content: center;">
        <div>
          <strong>Player 1</strong>
          <ul role="list">
            ${Object.entries(bindings.player1).map(([action, key]) => `
              <li role="listitem">
                <button class="control-key" data-action="${action}" data-player="1" tabindex="0" aria-label="${ACTION_LABELS[action] || action}">
                  <code>${key.replace('Key', '')}</code>
                  <span class="visually-hidden">${ACTION_LABELS[action] || action}</span>
                </button>
                <span style="margin-left: 8px;">${ACTION_LABELS[action] || action}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div>
          <strong>Player 2</strong>
          <ul role="list">
            ${Object.entries(bindings.player2).map(([action, key]) => `
              <li role="listitem">
                <button class="control-key" data-action="${action}" data-player="2" tabindex="0" aria-label="${ACTION_LABELS[action] || action}">
                  <code>${key.replace('Key', '')}</code>
                  <span class="visually-hidden">${ACTION_LABELS[action] || action}</span>
                </button>
                <span style="margin-left: 8px;">${ACTION_LABELS[action] || action}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
      <p style="margin-top:16px;font-size:0.95em;">Tip: Hover or focus a key for details. Controls can be remapped in settings.</p>
    `;
    // Add close button
    container.appendChild(createCloseButton());
    // Tooltip logic
    container.querySelectorAll('.control-key').forEach(btn => {
      btn.addEventListener('mouseenter', e => {
        const action = btn.dataset.action;
        showTooltip(ACTION_LABELS[action] || action, btn);
      });
      btn.addEventListener('mouseleave', hideTooltip);
      btn.addEventListener('focus', e => {
        const action = btn.dataset.action;
        showTooltip(ACTION_LABELS[action] || action, btn);
      });
      btn.addEventListener('blur', hideTooltip);
    });
    // Keyboard navigation
    container.onkeydown = handleKeyNav;
    // Animate in
    setTimeout(() => { container.style.opacity = '1'; }, 10);
  } catch (e) {
    if (container) container.innerHTML = `<div style="color:#b91c1c">Error loading controls info: ${e.message}</div>`;
    console.warn('[controlsInfo] Render error:', e);
  }
}

function showControlsInfo() {
  try {
    if (!container) renderControlsInfo();
    container.style.display = '';
    setTimeout(() => { container.style.opacity = '1'; }, 10);
    container.focus();
  } catch (e) {
    console.warn('[controlsInfo] Show error:', e);
  }
}

function hideControlsInfo() {
  try {
    if (container) {
      container.style.opacity = '0';
      setTimeout(() => { if (container) container.style.display = 'none'; }, 400);
    }
    hideTooltip();
  } catch (e) {
    console.warn('[controlsInfo] Hide error:', e);
  }
}

function applySettings(settings) {
  renderControlsInfo();
}

// Show/hide controls info based on screen state
onScreenStateChange(state => {
  const controlsInfoEl = document.querySelector('.controls-info');
  if (!controlsInfoEl) return;
  if (state === 'MENU' || state === 'SETTINGS_MENU') {
    controlsInfoEl.style.display = 'block';
  } else {
    controlsInfoEl.style.display = 'none';
  }
});

if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('settingsChanged', ({ settings }) => {
    applySettings(settings);
  });
  eventManager.subscribe('keyBindingsChanged', ({ bindings }) => {
    renderControlsInfo();
  });
  // Show controls info UI when remap is triggered
  eventManager.subscribe('showControlsRemap', () => {
    showControlsInfo();
  });
}

// --- UI Integration: Expose controlsInfo API for other UI modules ---
window.controlsInfoUI = {
  renderControlsInfo,
  showControlsInfo,
  hideControlsInfo,
  applySettings
};

// --- UI Integration: Listen for menu and messageDisplay events ---
try {
  // Integrate with menu.js if available
  if (window.menuDebug && typeof window.menuDebug.onMenuEvent === 'function') {
    window.menuDebug.onMenuEvent('showMenu', ({ state }) => {
      if (state === 'SETTINGS_MENU') showControlsInfo();
      else hideControlsInfo();
    });
  }
  // Integrate with messageDisplay.js if available
  if (window.messageDisplayDebug && typeof window.messageDisplayDebug.onMessageEvent === 'function') {
    window.messageDisplayDebug.onMessageEvent('show', ({ message, opts }) => {
      if (message && message.toLowerCase().includes('controls')) showControlsInfo();
    });
  }
} catch (e) {
  console.warn('[controlsInfo] UI integration error:', e);
}

export {
  renderControlsInfo,
  showControlsInfo,
  hideControlsInfo,
  applySettings
};