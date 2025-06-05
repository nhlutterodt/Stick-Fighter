// Simple finite state machine for managing animation states

/**
 * StateMachine manages current state and transitions.
 * @example
 * const fsm = new StateMachine('idle', {
 *   idle: { walk: 'walking', attack: 'attacking' },
 *   walking: { idle: 'idle', attack: 'attacking' },
 *   attacking: { idle: 'idle' }
 * });
 */
export class StateMachine {
  /**
   * @param {string} initialState
   * @param {{ [state:string]: { [event:string]: string } }} transitions
   */
  constructor(initialState, transitions) {
    this.state = initialState;
    this.transitions = transitions || {};
    this.handlers = { onEnter: {}, onExit: {} };
  }

  /**
   * Send an event to the FSM, causing a state transition if defined.
   * @param {string} event
   */
  send(event) {
    const from = this.state;
    const dest = this.transitions[from]?.[event];
    if (dest && dest !== from) {
      this._exitState(from, event);
      this.state = dest;
      this._enterState(dest, event);
    }
    return this.state;
  }

  /**
   * Register an onEnter handler for a state.
   * @param {string} state
   * @param {function(string,string):void} fn - (event, fromState)
   */
  onEnter(state, fn) {
    this.handlers.onEnter[state] = fn;
  }

  /**
   * Register an onExit handler for a state.
   * @param {string} state
   * @param {function(string,string):void} fn - (event, toState)
   */
  onExit(state, fn) {
    this.handlers.onExit[state] = fn;
  }

  _enterState(state, event) {
    const fn = this.handlers.onEnter[state];
    if (typeof fn === 'function') fn(event, this.state);
  }

  _exitState(state, event) {
    const fn = this.handlers.onExit[state];
    if (typeof fn === 'function') fn(event, this.state);
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
}
