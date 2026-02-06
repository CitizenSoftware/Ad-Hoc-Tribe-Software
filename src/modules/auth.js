import { state, saveAll, getActiveNetwork } from '../store.js';
import { el, uid } from '../lib/utils.js';

function ensureAccount(username) {
  let acc = state.accounts.find(a => a.username === username);
  if (!acc) {
    acc = {
      id: uid(),
      username,
      displayName: username,
      profile: { networkId: getActiveNetwork().id }
    };
    state.accounts.push(acc);
  } else if (!acc.profile) {
    acc.profile = { networkId: getActiveNetwork().id };
  } else if (!acc.profile.networkId) {
    acc.profile.networkId = getActiveNetwork().id;
  }
  return acc;
}

export function initAuthButton({ onChange } = {}) {
  const btn = el('authBtn');
  if (!btn) return;

  const update = () => {
    btn.textContent = state.session ? 'Sign Out' : 'Sign In';
  };

  update();

  btn.onclick = () => {
    if (state.session) {
      state.session = null;
      saveAll();
      update();
      if (onChange) onChange();
      return;
    }

    const username = window.prompt('Enter username');
    if (!username) return;
    const trimmed = username.trim();
    if (!trimmed) return;

    const acc = ensureAccount(trimmed);
    state.session = { username: acc.username };
    saveAll();
    update();
    if (onChange) onChange();
  };
}
