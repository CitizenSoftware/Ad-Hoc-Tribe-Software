import { loadState, persistState } from './lib/storage.js';

export const state = loadState();

export function saveAll() {
  persistState(state);
}

export function setUnitMode(mode) {
  state.unitMode = mode;
  localStorage.setItem('ns_units', mode);
}

export function getActiveNetwork() {
  return state.networks.find(n => n.active) || state.networks[0];
}

export function getActiveLayer() {
  return state.layers.find(l => l.active) || state.layers[0];
}
