// controls.js - Modular input/controls system for 2D Stick Fighter
// Handles keyboard (and future mouse/gamepad) input, supports remapping, event-driven, and debug integration

import { eventManager } from './eventManager.js';
import { obstacles, checkObstacleCollision } from './obstacles.js';

// Internal state
const keyState = {};
const listeners = [];
let debugMode = false;
let keyMap = {};

// Default key bindings for two players
/**
 * @readonly
 * @type {Readonly<{player1: Object, player2: Object}>}
 */
const defaultBindings = Object.freeze({
    player1: Object.freeze({
        left: 'KeyA', right: 'KeyD', jump: 'KeyW', punch: 'KeyF', kick: 'KeyG', guard: 'ShiftLeft',
        slam: 'KeyS', airDodge: 'KeyC', parry: 'KeyV', run: 'KeyQ', turn: 'KeyR'
    }),
    player2: Object.freeze({
        left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', punch: 'KeyK', kick: 'KeyL', guard: 'ShiftRight',
        slam: 'ArrowDown', airDodge: 'KeyM', parry: 'KeyN', run: 'KeyU', turn: 'KeyP'
    })
});

/**
 * Set custom key bindings, merged with defaults.
 * @param {Object} bindings
 */
function setKeyBindings(bindings) {
    keyMap = { player1: { ...defaultBindings.player1, ...(bindings?.player1 || {}) }, player2: { ...defaultBindings.player2, ...(bindings?.player2 || {}) } };
}

/**
 * Get a copy of the current key bindings.
 * @returns {Object}
 */
function getKeyBindings() {
    return { player1: { ...keyMap.player1 }, player2: { ...keyMap.player2 } };
}

/**
 * Check if a key is currently pressed.
 * @param {string} code
 * @returns {boolean}
 */
function isKeyPressed(code) {
    return !!keyState[code];
}

/**
 * Subscribe to input events.
 * @param {Function} callback
 */
function subscribeInput(callback) {
    if (typeof callback === 'function') listeners.push(callback);
}

/**
 * Unsubscribe from input events.
 * @param {Function} callback
 */
function unsubscribeInput(callback) {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
}

function enableDebug() { debugMode = true; }
function disableDebug() { debugMode = false; }

// --- Settings and Utility Extensions ---
let settings = {
    allowRemap: true,
    allowMultipleKeys: false, // If true, allow multiple keys per action
    inputDebounceMs: 0, // Debounce time for rapid key events
    suppressRepeat: true // Ignore repeated keydown events
};
let lastInputTimestamps = {};

function setControlsSettings(newSettings) {
    settings = { ...settings, ...newSettings };
}

function getControlsSettings() {
    return { ...settings };
}

// --- Enhanced Event Management, Debugging, and Error Handling ---

// Allow custom error handler for input system
let onInputError = (err, context) => { if (debugMode) console.error('[Controls Error]', err, context); };

function setInputErrorHandler(handler) {
    if (typeof handler === 'function') onInputError = handler;
}

// Allow custom debug event hooks
let debugHooks = {
    onInput: null, // (eventType, payload) => void
    onRemap: null, // (player, action, oldKey, newKey) => void
    onRecording: null, // (eventType, payload) => void
    onPlayback: null // (eventType, payload) => void
};

function setDebugHooks(hooks) {
    debugHooks = { ...debugHooks, ...hooks };
}

function emitDebugEvent(eventType, payload) {
    if (debugHooks && typeof debugHooks.onInput === 'function') {
        try { debugHooks.onInput(eventType, payload); } catch (e) { if (debugMode) console.warn('Debug hook error', e); }
    }
    eventManager.dispatchEvent('controlsDebug', { eventType, payload });
}

// Wrap remapKey for debug and event
function remapKey(player, action, newKey) {
    if (!settings.allowRemap) return false;
    if (!keyMap[player]) keyMap[player] = {};
    const oldKey = keyMap[player][action];
    keyMap[player][action] = newKey;
    emitDebugEvent('remap', { player, action, oldKey, newKey });
    if (typeof debugHooks.onRemap === 'function') {
        try { debugHooks.onRemap(player, action, oldKey, newKey); } catch (e) { if (debugMode) console.warn('Remap debug hook error', e); }
    }
    return true;
}

function getPressedActions(player) {
    const bindings = keyMap[player] || {};
    // Use Array.prototype.reduce for performance
    return Object.entries(bindings).reduce((acc, [action, code]) => {
        if (keyState[code]) acc.push(action);
        return acc;
    }, []);
}

// --- Utility: Get action for a given key code (reverse lookup) ---
function getActionForKey(player, code) {
    const bindings = keyMap[player] || {};
    // Use Object.entries for clarity and performance
    for (const [action, key] of Object.entries(bindings)) {
        if (key === code) return action;
    }
    return null;
}
function getKeyForAction(player, action) {
    return (keyMap[player] && keyMap[player][action]) || null;
}

// --- Advanced Utility & Features ---
let inputHistory = [];
let inputHistoryLimit = 100;
let inputRecording = false;
let inputPlayback = false;
let playbackIndex = 0;
let playbackData = [];

function startInputRecording() {
    inputHistory = [];
    inputRecording = true;
}

function stopInputRecording() {
    inputRecording = false;
}

function getInputHistory() {
    return [...inputHistory];
}

function setInputHistoryLimit(limit) {
    inputHistoryLimit = limit;
}

function playInputHistory(history) {
    if (!Array.isArray(history)) return;
    playbackData = [...history];
    playbackIndex = 0;
    inputPlayback = true;
    // Optionally, disable real input during playback
}

function stopInputPlayback() {
    inputPlayback = false;
    playbackIndex = 0;
    playbackData = [];
}

function isInputRecording() { return inputRecording; }
function isInputPlayback() { return inputPlayback; }

// --- Combo System ---
let comboState = {
    active: false,
    sequence: [], // Array of { code, isDown, timestamp }
    lastInputTime: 0,
    comboWindow: 350, // ms between presses
    minComboLength: 2,
    maxComboLength: 6,
    onCombo: null // callback(comboSequence)
};

function setComboSettings(settings) {
    comboState = { ...comboState, ...settings };
}

function getComboSettings() {
    return { ...comboState };
}

function setComboCallback(cb) {
    comboState.onCombo = cb;
}

function clearCombo() {
    comboState.active = false;
    comboState.sequence = [];
    comboState.lastInputTime = 0;
}

function _checkComboTimeout(now) {
    if (comboState.sequence.length > 0 && now - comboState.lastInputTime > comboState.comboWindow) {
        clearCombo();
    }
}

function _registerComboInput(code, isDown, timestamp) {
    if (!isDown) return;
    const now = timestamp ?? Date.now();
    _checkComboTimeout(now);
    if (!comboState.active) comboState.active = true;
    comboState.sequence.push({ code, isDown, timestamp: now });
    comboState.lastInputTime = now;
    // Limit combo length
    if (comboState.sequence.length > comboState.maxComboLength) {
        comboState.sequence.shift();
    }
    // Check for valid combo
    if (comboState.sequence.length >= comboState.minComboLength) {
        // Fire combo callback if set
        if (typeof comboState.onCombo === 'function') {
            try { comboState.onCombo([...comboState.sequence]); } catch (e) { if (debugMode) console.warn('Combo callback error', e); }
        }
        emitDebugEvent('combo', { sequence: [...comboState.sequence] });
        fireComboPerformed('player1', [...comboState.sequence]);
        clearCombo();
    }
}

// --- Combo Performed Event System ---
const comboPerformedListeners = [];

/**
 * Register a callback to be invoked when a combo is performed.
 * @param {function} listener - Function to call with combo details: ({ player, comboSequence, timestamp })
 */
export function onComboPerformed(listener) {
  if (typeof listener === 'function') {
    comboPerformedListeners.push(listener);
  }
}

// Internal: Call this when a combo is detected in your combo system
function fireComboPerformed(player, comboSequence) {
  const detail = { player, comboSequence, timestamp: Date.now() };
  for (const cb of comboPerformedListeners) {
    try { cb(detail); } catch (e) { if (typeof window !== 'undefined' && window.DEBUG_MODE) console.warn('[controls] ComboPerformed listener error:', e); }
  }
  // Optionally, dispatch to eventManager for global eventing
  if (typeof eventManager?.dispatchEvent === 'function') {
    eventManager.dispatchEvent('comboPerformed', detail);
  }
}

// Enhanced error handling in input event
function shouldDebounceInput(e, isDown) {
    if (settings.suppressRepeat && isDown && e.repeat) return true;
    if (settings.inputDebounceMs > 0) {
        const now = Date.now();
        if (lastInputTimestamps[e.code] && now - lastInputTimestamps[e.code] < settings.inputDebounceMs) return true;
        lastInputTimestamps[e.code] = now;
    }
    return false;
}

function processDebugHooks(e, isDown) {
    emitDebugEvent('input', { code: e.code, isDown, event: e });
    if (debugMode) console.log(`[Controls] ${isDown ? 'Down' : 'Up'}: ${e.code}`);
}

function processInputHistory(e, isDown) {
    if (inputRecording) {
        inputHistory.push({ code: e.code, isDown, timestamp: Date.now() });
        if (inputHistory.length > inputHistoryLimit) inputHistory.shift();
        if (typeof debugHooks.onRecording === 'function') {
            try { debugHooks.onRecording('record', { code: e.code, isDown }); } catch (e) { if (debugMode) console.warn('Recording debug hook error', e); }
        }
    }
}

function processComboSystem(e, isDown) {
    _registerComboInput(e.code, isDown, Date.now());
}

function notifyListeners(e, isDown) {
    listeners.forEach(cb => {
        try { cb(e.code, isDown, e); } catch (err) { onInputError(err, { code: e.code, isDown, event: e }); }
    });
}

function handleKeyEvent(e, isDown) {
    try {
        if (shouldDebounceInput(e, isDown)) return;
        keyState[e.code] = isDown;
        eventManager.dispatchEvent('input', { code: e.code, isDown, event: e });
        processDebugHooks(e, isDown);
        notifyListeners(e, isDown);
        processInputHistory(e, isDown);
        processComboSystem(e, isDown);
    } catch (err) {
        onInputError(err, { code: e.code, isDown, event: e });
    }
}

// Enhanced input playback tick with debug and error handling
function tickInputPlayback() {
    if (!inputPlayback || playbackIndex >= playbackData.length) return;
    const entry = playbackData[playbackIndex];
    try {
        if (entry) {
            keyState[entry.code] = entry.isDown;
            eventManager.dispatchEvent('input', { code: entry.code, isDown: entry.isDown, event: null, playback: true });
            emitDebugEvent('playback', { code: entry.code, isDown: entry.isDown });
            listeners.forEach(cb => {
                try { cb(entry.code, entry.isDown, null); } catch (err) { onInputError(err, { code: entry.code, isDown: entry.isDown, playback: true }); }
            });
            if (typeof debugHooks.onPlayback === 'function') {
                try { debugHooks.onPlayback('playback', { code: entry.code, isDown: entry.isDown }); } catch (e) { if (debugMode) console.warn('Playback debug hook error', e); }
            }
        }
        playbackIndex++;
        if (playbackIndex >= playbackData.length) stopInputPlayback();
    } catch (err) {
        onInputError(err, { code: entry?.code, isDown: entry?.isDown, playback: true });
    }
}

// Example utility: Expose obstacle info to controls for context-aware input (e.g., jump if obstacle ahead)
export function getNearbyObstacleInfo(playerRect, range = 30) {
  // Returns the first obstacle within range in front of the player
  const facingRight = playerRect.facingRight !== false;
  const probeRect = {
    x: facingRight ? playerRect.x + playerRect.width : playerRect.x - range,
    y: playerRect.y,
    width: range,
    height: playerRect.height
  };
  const obs = obstacles.find(o => checkObstacleCollision(probeRect));
  return obs ? obs.describe() : null;
}

// --- Utility: clear all input state ---
function clearInputState() {
    Object.keys(keyState).forEach(k => { keyState[k] = false; });
}

// Attach global listeners (idempotent)
if (typeof window !== 'undefined' && !window._stickfighterControlsAttached) {
    window.addEventListener('keydown', e => handleKeyEvent(e, true));
    window.addEventListener('keyup', e => handleKeyEvent(e, false));
    window._stickfighterControlsAttached = true;
}

// --- Integration: Listen for menu reset events to reset controls ---
if (eventManager && typeof eventManager.subscribe === 'function') {
    eventManager.subscribe('menuMainMenu', () => {
        resetKeyBindings();
    });
    eventManager.subscribe('resetKeyBindings', () => {
        resetKeyBindings();
    });
}

function resetKeyBindings() {
    keyMap = { player1: { ...defaultBindings.player1 }, player2: { ...defaultBindings.player2 } };
    eventManager.dispatchEvent('keyBindingsChanged', { bindings: getKeyBindings() });
}

// Add JSDoc to all exports for better integration
export {
    setKeyBindings,
    getKeyBindings,
    isKeyPressed,
    subscribeInput,
    unsubscribeInput,
    enableDebug,
    disableDebug,
    keyState,
    defaultBindings,
    setControlsSettings,
    getControlsSettings,
    remapKey,
    getActionForKey,
    getKeyForAction,
    resetKeyBindings,
    getPressedActions,
    startInputRecording,
    stopInputRecording,
    getInputHistory,
    setInputHistoryLimit,
    playInputHistory,
    stopInputPlayback,
    isInputRecording,
    isInputPlayback,
    tickInputPlayback,
    clearInputState,
    setInputErrorHandler,
    setDebugHooks,
    emitDebugEvent,
    setComboSettings,
    getComboSettings,
    setComboCallback,
    clearCombo
};