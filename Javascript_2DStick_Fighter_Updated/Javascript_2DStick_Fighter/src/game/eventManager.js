// eventManager.js - Modular, extensible event system for 2D Stick Fighter
// Provides subscribe, unsubscribe, dispatchEvent, and advanced event features

class EventManager {
    constructor() {
        this.listeners = {};
        this.eventLog = [];
        this.debugMode = false;
    }

    subscribe(eventType, callback) {
        if (typeof callback !== 'function') {
            this._logError('subscribe: callback must be a function', { eventType, callback });
            return;
        }
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
        if (this.debugMode) this._log(`Subscribed to event: ${eventType}`);
    }

    unsubscribe(eventType, callback) {
        if (!this.listeners[eventType]) return;
        this.listeners[eventType] = this.listeners[eventType].filter(listener => listener !== callback);
        if (this.debugMode) this._log(`Unsubscribed from event: ${eventType}`);
    }

    dispatchEvent(eventType, detail) {
        if (!this.listeners[eventType]) return;
        this.eventLog.push({ eventType, detail, timestamp: Date.now() });
        this.listeners[eventType].forEach(listener => {
            try {
                listener(detail);
            } catch (e) {
                this._logError(`Error in event listener for ${eventType}: ${e.message}`, { eventType, detail, error: e });
            }
        });
        if (this.debugMode) this._log(`Dispatched event: ${eventType}`, detail);
    }

    once(eventType, callback) {
        const wrapper = (detail) => {
            this.unsubscribe(eventType, wrapper);
            callback(detail);
        };
        this.subscribe(eventType, wrapper);
    }

    getEventLog() {
        return [...this.eventLog];
    }

    clearEventLog() {
        this.eventLog = [];
    }

    enableDebug() { this.debugMode = true; }
    disableDebug() { this.debugMode = false; }

    _log(msg, data) {
        if (data !== undefined) {
            // eslint-disable-next-line no-console
            console.log(`[EventManager] ${msg}`, data);
        } else {
            // eslint-disable-next-line no-console
            console.log(`[EventManager] ${msg}`);
        }
    }

    _logError(msg, data) {
        if (data !== undefined) {
            // eslint-disable-next-line no-console
            console.error(`[EventManager ERROR] ${msg}`, data);
        } else {
            // eslint-disable-next-line no-console
            console.error(`[EventManager ERROR] ${msg}`);
        }
    }
}

// Export a singleton instance
export const eventManager = new EventManager();

// For advanced use: export the class as well
export default EventManager;