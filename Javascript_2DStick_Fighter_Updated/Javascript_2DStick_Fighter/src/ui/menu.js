// menu.js - Modern, event-driven menu UI for Stick Fighter
// Author: Modularized for ES, accessibility, and advanced UI/UX

import { eventManager } from '../game/eventManager.js';

// Menu states
const MENU_STATES = ['MENU', 'MODE_SELECT', 'DIFFICULTY_SELECT', 'PAUSED', 'SETTINGS_MENU', 'END'];
let currentMenuState = 'MENU';

// Menu button definitions (mirrors canvas-drawn buttons)
const MENU_BUTTONS = {
  MENU: [
    { id: 'start', text: 'Start Game', color: '#60a5fa', hoverColor: '#3b82f6', textColor: '#fff' }
  ],
  MODE_SELECT: [
    { id: 'pvp', text: 'Player vs Player', color: '#34d399', hoverColor: '#10b981', textColor: '#fff' },
    { id: 'pvc', text: 'Player vs Computer', color: '#fbbf24', hoverColor: '#f59e0b', textColor: '#92400e' }
  ],
  DIFFICULTY_SELECT: [
    { id: 'easy', text: 'Easy', color: '#a7f3d0', hoverColor: '#6ee7b7', textColor: '#065f46' },
    { id: 'medium', text: 'Medium', color: '#fcd34d', hoverColor: '#fbbf24', textColor: '#92400e' },
    { id: 'hard', text: 'Hard', color: '#f87171', hoverColor: '#ef4444', textColor: '#991b1b' }
  ],
  PAUSED: [
    { id: 'resume', text: 'Resume', color: '#34d399', hoverColor: '#10b981', textColor: '#fff' },
    { id: 'pauseSettings', text: 'Settings', color: '#fbbf24', hoverColor: '#f59e0b', textColor: '#fff' },
    { id: 'pauseMainMenu', text: 'Main Menu', color: '#f87171', hoverColor: '#ef4444', textColor: '#fff' }
  ],
  SETTINGS_MENU: [
    { id: 'settingsBack', text: 'Back', color: '#60a5fa', hoverColor: '#3b82f6', textColor: '#fff' },
    { id: 'gravityLow', text: 'Gravity: Low', color: '#fbbf24', hoverColor: '#fde68a', textColor: '#92400e' },
    { id: 'gravityNormal', text: 'Gravity: Normal', color: '#60a5fa', hoverColor: '#3b82f6', textColor: '#2563eb' },
    { id: 'gravityHigh', text: 'Gravity: High', color: '#ef4444', hoverColor: '#f87171', textColor: '#fff' }
  ],
  END: [
    { id: 'endMainMenu', text: 'Main Menu', color: '#60a5fa', hoverColor: '#3b82f6', textColor: '#fff' }
  ]
};

// --- Menu Overlay DOM Management ---
let overlay = null;

function createMenuOverlay() {
  const el = document.createElement('div');
  el.className = 'menu-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('tabindex', '-1');
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
}

function getMenuOverlay() {
  if (!overlay) overlay = createMenuOverlay();
  return overlay;
}

function getMenuTitle(state) {
  switch (state) {
    case 'MENU': return 'Stick Fighter';
    case 'MODE_SELECT': return 'Select Mode';
    case 'DIFFICULTY_SELECT': return 'Select Difficulty';
    case 'PAUSED': return 'Paused';
    case 'SETTINGS_MENU': return 'Settings';
    case 'END': return 'Game Over';
    default: return '';
  }
}

function createMenuButton(btn, onClick) {
  const button = document.createElement('button');
  button.className = 'menu-button';
  button.id = btn.id;
  button.textContent = btn.text;
  button.style.background = btn.color;
  button.style.color = btn.textColor;
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', btn.text);
  button.addEventListener('mouseenter', () => button.style.background = btn.hoverColor);
  button.addEventListener('mouseleave', () => button.style.background = btn.color);
  button.addEventListener('click', onClick);
  return button;
}

function clearMenuOverlay() {
  const overlay = getMenuOverlay();
  overlay.innerHTML = '';
  overlay.classList.remove('active');
  overlay.style.display = 'none';
}

function focusFirstMenuButton() {
  const overlay = getMenuOverlay();
  const btn = overlay.querySelector('button');
  if (btn) btn.focus();
}

// --- Enhancement 1: Type Safety and Input Validation ---
function isValidMenuState(state) {
  return MENU_STATES.includes(state);
}
function isValidMenuEventType(eventType) {
  // Accepts both built-in and custom menu events
  const builtInEvents = [
    'menuStart', 'menuModeSelect', 'menuDifficultySelect', 'menuMainMenu',
    'settingsChanged', 'pause', 'resume', 'gameOver', 'showMenu'
  ];
  return typeof eventType === 'string' && (builtInEvents.includes(eventType) || eventType in menuEventListeners);
}
function isValidMenuButtonDef(btn) {
  return btn && typeof btn.id === 'string' && typeof btn.text === 'string';
}

// Patch updateMenuState and renderMenu for validation
function updateMenuState(state) {
  try {
    if (!isValidMenuState(state)) {
      console.warn(`[menu] Attempted to update to invalid state: ${state}`);
      return;
    }
    currentMenuState = state;
    renderMenu(state);
  } catch (e) {
    console.error('[menu] Error updating menu state:', e);
  }
}
function renderMenu(state = currentMenuState) {
  try {
    const overlay = getMenuOverlay();
    clearMenuOverlay();
    if (!isValidMenuState(state)) {
      console.warn(`[menu] Invalid menu state: ${state}`);
      return;
    }
    const buttons = MENU_BUTTONS[state] || [];
    // Title
    const title = getMenuTitle(state);
    if (title) {
      const h2 = document.createElement('h2');
      h2.className = 'menu-overlay-text';
      h2.textContent = title;
      overlay.appendChild(h2);
    }
    // Buttons
    buttons.forEach(btn => {
      if (!isValidMenuButtonDef(btn)) {
        console.warn('[menu] Invalid button definition:', btn);
        return;
      }
      try {
        const button = createMenuButton(btn, () => {
          logMenuEvent('buttonClick', { id: btn.id, state });
          handleMenuAction(btn.id);
        });
        overlay.appendChild(button);
      } catch (e) {
        console.error(`[menu] Error rendering button ${btn.id}:`, e);
      }
    });
    overlay.style.display = 'block';
    setTimeout(() => {
      animateMenuIn();
      focusFirstMenuButton();
      addMenuButtonTooltips();
    }, 10);
    overlay.focus();
    logMenuEvent('menuShown', { state });
  } catch (e) {
    console.error('[menu] Error rendering menu:', e);
  }
}
// Patch event registration for validation - moved to avoid duplication

// --- Enhancement 2: Performance and Memory Management ---
// Remove all menu button tooltips before re-adding (prevents duplicate listeners)
function addMenuButtonTooltips() {
  const overlay = getMenuOverlay();
  overlay.querySelectorAll('button').forEach(btn => {
    btn.removeEventListener('mouseenter', btn._menuTooltipEnter);
    btn.removeEventListener('mouseleave', btn._menuTooltipLeave);
    btn._menuTooltipEnter = () => btn.setAttribute('title', btn.textContent);
    btn._menuTooltipLeave = () => btn.removeAttribute('title');
    btn.addEventListener('mouseenter', btn._menuTooltipEnter);
    btn.addEventListener('mouseleave', btn._menuTooltipLeave);
  });
}
// Clean up all custom menu event listeners for a given event type
function clearMenuEventListeners(eventType) {
  if (menuEventListeners[eventType]) {
    menuEventListeners[eventType].length = 0;
  }
}
// Optionally: clear all listeners (for teardown or reload)
function clearAllMenuEventListeners() {
  Object.keys(menuEventListeners).forEach(evt => {
    menuEventListeners[evt].length = 0;
  });
}

// --- Animation and Logging ---
function animateMenuIn() {
  const overlay = getMenuOverlay();
  overlay.classList.add('active');
}
function animateMenuOut() {
  const overlay = getMenuOverlay();
  overlay.classList.remove('active');
}

function logMenuEvent(event, detail) {
  if (window?.DEBUG_MODE) {
    console.debug(`[MENU ANALYTICS] ${event}`, detail);
  }
}

// --- Menu Rendering and Hiding ---
function hideMenu() {
  try {
    const overlay = getMenuOverlay();
    if (!overlay) return;
    animateMenuOut();
    setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 400);
    logMenuEvent('menuHidden', { state: currentMenuState });
  } catch (e) {
    console.error('[menu] Error hiding menu:', e);
  }
}

// --- Enhanced Event Management & Debugging ---
// Centralized menu event dispatching and logging
// --- Advanced Event-Driven Features ---
// Allow external modules to register custom menu event listeners
const menuEventListeners = {};
function onMenuEvent(eventType, listener) {
  if (!isValidMenuEventType(eventType)) {
    console.warn('[menu] Attempted to register invalid event type:', eventType);
    return;
  }
  if (!menuEventListeners[eventType]) menuEventListeners[eventType] = [];
  menuEventListeners[eventType].push(listener);
}
function offMenuEvent(eventType, listener) {
  if (!isValidMenuEventType(eventType)) return;
  if (!menuEventListeners[eventType]) return;
  menuEventListeners[eventType] = menuEventListeners[eventType].filter(l => l !== listener);
}
// Internal: Fire all registered listeners for a menu event
function fireMenuEvent(eventType, detail) {
  if (menuEventListeners[eventType]) {
    menuEventListeners[eventType].forEach(listener => {
      try { listener(detail); } catch (e) { console.error(`[menu] Error in custom menu event listener for ${eventType}:`, e); }
    });
  }
}
// Patch dispatchMenuEvent to also fire custom listeners
function dispatchMenuEvent(eventType, detail = {}) {
  try {
    if (!isValidMenuEventType(eventType)) {
      console.warn('[menu] Attempted to dispatch invalid event type:', eventType);
      return;
    }
    if (eventManager && typeof eventManager.dispatchEvent === 'function') {
      eventManager.dispatchEvent(eventType, detail);
      logMenuEvent('eventDispatched', { eventType, detail });
    } else {
      console.warn('[menu] EventManager not available for event:', eventType, detail);
    }
    fireMenuEvent(eventType, detail);
  } catch (e) {
    console.error(`[menu] Error dispatching event (${eventType}):`, e);
  }
}
// --- Advanced: One-time event listener ---
function onceMenuEvent(eventType, listener) {
  function wrapper(detail) {
    offMenuEvent(eventType, wrapper);
    listener(detail);
  }
  onMenuEvent(eventType, wrapper);
}
// --- Advanced: Menu event queue for async workflows ---
const menuEventQueue = [];
function queueMenuEvent(eventType, detail = {}) {
  menuEventQueue.push({ eventType, detail });
}
function processMenuEventQueue() {
  while (menuEventQueue.length > 0) {
    const evt = menuEventQueue.shift();
    dispatchMenuEvent(evt.eventType, evt.detail);
  }
}

// Subscribe to all menu-related events for debug logging
function subscribeMenuDebugEvents() {
  if (!eventManager || typeof eventManager.subscribe !== 'function') return;
  const debugEvents = [
    'menuStart', 'menuModeSelect', 'menuDifficultySelect', 'menuMainMenu',
    'settingsChanged', 'pause', 'resume', 'gameOver', 'showMenu'
  ];
  debugEvents.forEach(evt => {
    eventManager.subscribe(evt, detail => {
      logMenuEvent('eventReceived', { event: evt, detail });
    });
  });
}
subscribeMenuDebugEvents();

// Patch handleMenuAction to use dispatchMenuEvent
function handleMenuAction(id) {
  try {
    switch (id) {
      case 'start':
        dispatchMenuEvent('menuStart', {});
        hideMenu();
        break;
      case 'pvp':
        dispatchMenuEvent('menuModeSelect', { mode: 'PvP' });
        hideMenu();
        break;
      case 'pvc':
        updateMenuState('DIFFICULTY_SELECT');
        break;
      case 'easy':
      case 'medium':
      case 'hard':
        dispatchMenuEvent('menuDifficultySelect', { difficulty: id });
        hideMenu();
        break;
      case 'resume':
        dispatchMenuEvent('resume', {});
        hideMenu();
        break;
      case 'pauseSettings':
        updateMenuState('SETTINGS_MENU');
        break;
      case 'pauseMainMenu':
      case 'endMainMenu':
        dispatchMenuEvent('menuMainMenu', {});
        dispatchMenuEvent('resetKeyBindings', {}); // Enhanced: trigger controls reset
        hideMenu();
        break;
      case 'settingsBack':
        updateMenuState('PAUSED');
        break;
      case 'gravityLow':
        dispatchMenuEvent('settingsChanged', { gravity: 'low' });
        break;
      case 'gravityNormal':
        dispatchMenuEvent('settingsChanged', { gravity: 'normal' });
        break;
      case 'gravityHigh':
        dispatchMenuEvent('settingsChanged', { gravity: 'high' });
        break;
      default:
        console.warn(`[menu] Unhandled menu action: ${id}`);
        break;
    }
  } catch (e) {
    console.error(`[menu] Error handling menu action (${id}):`, e);
  }
}

// --- Keyboard Navigation & Accessibility ---
document.addEventListener('keydown', e => {
  try {
    if (!overlay || overlay.style.display !== 'block') return;
    const focusable = Array.from(overlay.querySelectorAll('button'));
    const idx = focusable.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'Tab') {
      focusable[(idx + 1) % focusable.length]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      focusable[(idx - 1 + focusable.length) % focusable.length]?.focus();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      if (currentMenuState === 'SETTINGS_MENU') updateMenuState('PAUSED');
      else if (currentMenuState === 'PAUSED' || currentMenuState === 'END') hideMenu();
      e.preventDefault();
    }
  } catch (e2) {
    console.error('[menu] Keyboard navigation error:', e2);
  }
});

// --- Event-driven integration ---
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('pause', () => updateMenuState('PAUSED'));
  eventManager.subscribe('resume', () => hideMenu());
  eventManager.subscribe('gameOver', () => updateMenuState('END'));
  eventManager.subscribe('showMenu', ({ state }) => updateMenuState(state));
}

// --- Debug: Expose menu state and overlay for inspection ---
window.menuDebug = {
  getState: () => currentMenuState,
  getOverlay: () => getMenuOverlay(),
  showMenu: renderMenu,
  hideMenu,
  updateMenuState,
  MENU_STATES,
  MENU_BUTTONS,
  onMenuEvent,
  offMenuEvent,
  onceMenuEvent,
  queueMenuEvent,
  processMenuEventQueue,
  menuEventListeners,
  menuEventQueue,
  clearMenuEventListeners,
  clearAllMenuEventListeners
};

// --- UI Integration: Expose menu API for other UI modules ---
window.menuUI = {
  renderMenu,
  hideMenu,
  updateMenuState,
  handleMenuAction,
  MENU_STATES,
  MENU_BUTTONS,
  onMenuEvent, // Only one assignment here
  offMenuEvent,
  onceMenuEvent,
  queueMenuEvent,
  processMenuEventQueue,
  menuEventListeners,
  menuEventQueue,
  clearMenuEventListeners,
  clearAllMenuEventListeners
};

// Export core menu API for external modules
export { updateMenuState };