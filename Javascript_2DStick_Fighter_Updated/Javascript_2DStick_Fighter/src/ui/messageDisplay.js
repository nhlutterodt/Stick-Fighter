// messageDisplay.js - Modern, event-driven message display UI for Stick Fighter
// Author: Modularized for ES, accessibility, and advanced UI/UX

import { eventManager } from '../game/eventManager.js';
import { onScreenStateChange } from './screenManager.js';

let container = null;
let hideTimeout = null;
const DEFAULT_DURATION = 2500;

function getMessageContainer() {
  if (!container) {
    container = document.getElementById('messageDisplay');
    if (!container) {
      container = document.createElement('div');
      container.id = 'messageDisplay';
      document.body.appendChild(container);
    }
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('tabindex', '-1');
    container.className = '';
    container.style.display = 'none';
    container.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideMessage();
    });
  }
  return container;
}

function showMessage(message, opts = {}) {
  try {
    if (typeof message !== 'string' || !message.trim()) throw new Error('Message must be a non-empty string');
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    clearTimeout(hideTimeout);
    el.textContent = message;
    el.className = 'active';
    el.style.display = 'block';
    el.setAttribute('aria-label', message);
    try { el.focus(); } catch (e) { console.warn('[messageDisplay] Focus error:', e); }
    if (opts.critical) el.classList.add('critical');
    messageHistory.push({ message, opts, timestamp: Date.now() });
    if (opts.duration !== 0) {
      hideTimeout = setTimeout(() => {
        try {
          hideMessage();
          if (typeof opts.onHide === 'function') opts.onHide();
        } catch (e) {
          console.warn('[messageDisplay] Error in hideMessage/onHide:', e);
        }
      }, opts.duration || DEFAULT_DURATION);
    } else if (typeof opts.onHide === 'function') {
      // If persistent, call onHide only when hideMessage is called
      const origHide = hideMessage;
      hideMessage = function patchedHide() {
        try {
          origHide();
          opts.onHide();
        } catch (e) {
          console.warn('[messageDisplay] Error in persistent onHide:', e);
        } finally {
          hideMessage = origHide;
        }
      };
    }
    if (window?.DEBUG_MODE) console.debug('[messageDisplay] showMessage:', message, opts);
    fireMessageEvent('show', { message, opts });
  } catch (e) {
    console.warn('[messageDisplay] Show error:', e);
    try {
      const el = getMessageContainer();
      if (el) {
        el.textContent = 'Error displaying message.';
        el.className = 'active critical';
        el.style.display = 'block';
      }
    } catch {}
  }
}

function hideMessage() {
  try {
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    el.classList.remove('active', 'critical');
    el.style.opacity = '0';
    setTimeout(() => {
      try {
        el.style.display = 'none';
        el.textContent = '';
        el.style.opacity = '';
      } catch (e) {
        console.warn('[messageDisplay] Error clearing message:', e);
      }
    }, 400);
    if (window?.DEBUG_MODE) console.debug('[messageDisplay] hideMessage');
  } catch (e) {
    console.warn('[messageDisplay] Hide error:', e);
  }
}

function setCritical(isCritical = true) {
  try {
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    if (isCritical) el.classList.add('critical');
    else el.classList.remove('critical');
  } catch (e) {
    console.warn('[messageDisplay] setCritical error:', e);
  }
}

function isVisible() {
  try {
    const el = getMessageContainer();
    return el && el.style.display !== 'none';
  } catch (e) {
    console.warn('[messageDisplay] isVisible error:', e);
    return false;
  }
}

function logMessageEvent(event, detail) {
  if (window?.DEBUG_MODE) {
    console.debug(`[MESSAGE ANALYTICS] ${event}`, detail);
  }
}

// --- Event-driven integration ---
if (eventManager && typeof eventManager.subscribe === 'function') {
  eventManager.subscribe('playerDefeated', ({ winner, loser }) => {
    showMessage(`${winner} defeated ${loser}!`, { critical: true, duration: 3000 });
    logMessageEvent('playerDefeated', { winner, loser });
  });
  eventManager.subscribe('powerupCollected', ({ player, powerup }) => {
    showMessage(`${player.name || 'Player'} collected a ${powerup.type} powerup!`);
    logMessageEvent('powerupCollected', { player, powerup });
  });
  eventManager.subscribe('pause', () => {
    showMessage('Paused', { duration: 0 });
    logMessageEvent('pause');
  });
  eventManager.subscribe('resume', () => {
    hideMessage();
    logMessageEvent('resume');
  });
  eventManager.subscribe('settingsChanged', () => {
    showMessage('Settings updated!', { duration: 1200 });
    logMessageEvent('settingsChanged');
  });
  eventManager.subscribe('diagnostic', ({ event, data }) => {
    if (window?.DEBUG_MODE) showMessage(`[DIAGNOSTIC] ${event}`, { duration: 1200 });
    logMessageEvent('diagnostic', { event, data });
  });
}

// --- Accessibility: Keyboard dismiss ---
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isVisible()) hideMessage();
});

// --- Enhanced Event Management & Debugging ---
const messageEventListeners = {};

function onMessageEvent(eventType, listener) {
  if (typeof eventType !== 'string' || typeof listener !== 'function') return;
  if (!messageEventListeners[eventType]) messageEventListeners[eventType] = [];
  messageEventListeners[eventType].push(listener);
}

function offMessageEvent(eventType, listener) {
  if (!messageEventListeners[eventType]) return;
  messageEventListeners[eventType] = messageEventListeners[eventType].filter(l => l !== listener);
}

function fireMessageEvent(eventType, detail) {
  if (messageEventListeners[eventType]) {
    messageEventListeners[eventType].forEach(listener => {
      try { listener(detail); } catch (e) { console.error(`[messageDisplay] Error in custom event listener for ${eventType}:`, e); }
    });
  }
}

function dispatchMessageEvent(eventType, detail = {}) {
  try {
    fireMessageEvent(eventType, detail);
    logMessageEvent('eventDispatched', { eventType, detail });
  } catch (e) {
    console.error(`[messageDisplay] Error dispatching event (${eventType}):`, e);
  }
}

// --- Utility: Message Queue for Sequential Display ---
const messageQueue = [];
let isMessageActive = false;

function queueMessage(message, opts = {}) {
  try {
    messageQueue.push({ message, opts });
    processMessageQueue();
  } catch (e) {
    console.warn('[messageDisplay] queueMessage error:', e);
  }
}

function processMessageQueue() {
  try {
    if (isMessageActive || messageQueue.length === 0) return;
    const { message, opts } = messageQueue.shift();
    isMessageActive = true;
    showMessage(message, {
      ...opts,
      onHide: () => {
        isMessageActive = false;
        processMessageQueue();
      }
    });
  } catch (e) {
    console.warn('[messageDisplay] processMessageQueue error:', e);
    isMessageActive = false;
  }
}

// --- Utility: Persistent Message (stays until explicitly hidden) ---
function showPersistentMessage(message, opts = {}) {
  try {
    showMessage(message, { ...opts, duration: 0 });
  } catch (e) {
    console.warn('[messageDisplay] showPersistentMessage error:', e);
  }
}

// --- Utility: Flash Message (shows briefly, then restores previous message if any) ---
let lastPersistentMessage = null;
function flashMessage(message, opts = {}) {
  try {
    const el = getMessageContainer();
    if (el && el.style.display !== 'none') {
      lastPersistentMessage = el.textContent;
    }
    showMessage(message, { ...opts, duration: opts.duration || 1000 });
    setTimeout(() => {
      try {
        if (lastPersistentMessage) {
          showPersistentMessage(lastPersistentMessage);
          lastPersistentMessage = null;
        }
      } catch (e) {
        console.warn('[messageDisplay] flashMessage restore error:', e);
      }
    }, opts.duration || 1000);
  } catch (e) {
    console.warn('[messageDisplay] flashMessage error:', e);
  }
}

// --- Utility: Message History ---
const messageHistory = [];
function getMessageHistory() {
  try {
    return [...messageHistory];
  } catch (e) {
    console.warn('[messageDisplay] getMessageHistory error:', e);
    return [];
  }
}

// --- Utility: Clear All Messages and Queue ---
function clearAllMessages() {
  try {
    messageQueue.length = 0;
    hideMessage();
  } catch (e) {
    console.warn('[messageDisplay] clearAllMessages error:', e);
  }
}

// --- Utility: Set Message Style Dynamically ---
function setMessageStyle(styleObj = {}) {
  try {
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    Object.entries(styleObj).forEach(([k, v]) => {
      el.style[k] = v;
    });
  } catch (e) {
    console.warn('[messageDisplay] setMessageStyle error:', e);
  }
}

// --- Utility: Set Message Icon ---
function setMessageIcon(iconHtml) {
  try {
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    el.innerHTML = iconHtml + '<span class="msg-text">' + el.textContent + '</span>';
  } catch (e) {
    console.warn('[messageDisplay] setMessageIcon error:', e);
  }
}

// --- Utility: Announce Message for Screen Readers Only ---
function announceMessageSR(message) {
  try {
    const el = getMessageContainer();
    if (!el) throw new Error('Message container not found');
    el.setAttribute('aria-live', 'assertive');
    el.textContent = message;
    setTimeout(() => el.setAttribute('aria-live', 'polite'), 1000);
  } catch (e) {
    console.warn('[messageDisplay] announceMessageSR error:', e);
  }
}

// --- Debug: Expose more utilities ---
window.messageDisplayDebug = {
  ...window.messageDisplayDebug,
  queueMessage,
  showPersistentMessage,
  flashMessage,
  getMessageHistory,
  clearAllMessages,
  setMessageStyle,
  setMessageIcon,
  announceMessageSR,
  messageQueue,
  messageHistory
};

// --- UI Integration: Expose messageDisplay API for other UI modules ---
window.messageDisplayUI = {
  showMessage,
  hideMessage,
  setCritical,
  isVisible,
  queueMessage,
  dispatchMessageEvent,
  onMessageEvent,
  offMessageEvent
};

// --- Hide message display except in MENU or END ---
onScreenStateChange(state => {
  const msgEl = document.getElementById('messageDisplay');
  if (!msgEl) return;
  if (state === 'MENU' || state === 'END') {
    msgEl.style.display = 'block';
  } else {
    msgEl.style.display = 'none';
  }
});

// --- Exported API ---
export {
  showMessage,
  hideMessage,
  setCritical,
  isVisible,
  onMessageEvent,
  offMessageEvent,
  dispatchMessageEvent,
  queueMessage,
  showPersistentMessage,
  flashMessage,
  getMessageHistory,
  clearAllMessages,
  setMessageStyle,
  setMessageIcon,
  announceMessageSR
};