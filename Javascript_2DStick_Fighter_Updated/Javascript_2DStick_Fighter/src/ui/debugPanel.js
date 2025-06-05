// filepath: src/ui/debugPanel.js
// debugPanel.js - Simple debug overlay for event logs and diagnostics
import { eventManager } from '../game/eventManager.js';

let panel, list;

function initDebugPanel() {
  panel = document.createElement('div');
  panel.id = 'debugPanel';
  // Inline styles for debug panel
  Object.assign(panel.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '320px',
    maxHeight: '40%',
    background: 'rgba(0,0,0,0.8)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflowY: 'auto',
    padding: '4px',
    zIndex: '10000',
    display: 'none'
  });
  document.body.appendChild(panel);
  list = document.createElement('ul');
  list.style.margin = 0;
  list.style.padding = '0 4px';
  list.style.listStyle = 'none';
  panel.appendChild(list);

  // Toggle debug panel with backtick (`) key
  window.addEventListener('keydown', e => {
    if (e.key === '`') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      eventManager.enableDebug();
    }
  });

  // Subscribe to selected events
  eventManager.subscribe('frame', ({ delta }) => {
    addLog(`[FRAME] Δ=${delta.toFixed(2)}ms`);
  });
  eventManager.subscribe('diagnostic', ({ event, data }) => {
    addLog(`[DIAG] ${event}`);
  });
  eventManager.subscribe('playerHit', ({ defender, attacker }) => {
    addLog(`[HIT] P${attacker.playerIndex+1} -> P${defender.playerIndex+1}`);
  });
}

function addLog(text) {
  if (!list) return;
  const li = document.createElement('li');
  li.textContent = text;
  list.appendChild(li);
  // Limit log entries
  if (list.childElementCount > 100) {
    list.removeChild(list.firstChild);
  }
  panel.scrollTop = panel.scrollHeight;
}

// Initialize on load
initDebugPanel();
