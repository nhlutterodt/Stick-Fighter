// saveManager.js - Save/load game state to localStorage for Stick Fighter
const SAVE_KEY = 'stickFighterSave';

export function saveGameState(stateObj) {
  try {
    const text = JSON.stringify(stateObj);
    localStorage.setItem(SAVE_KEY, text);
  } catch (e) {
    console.error('Error saving game state:', e);
  }
}

export function loadGameState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Validate minimal shape: must have players array
    if (!parsed.players || !Array.isArray(parsed.players)) {
      throw new Error('Invalid save format');
    }
    return parsed;
  } catch (e) {
    console.warn('Corrupt save detected—clearing:', e);
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}
