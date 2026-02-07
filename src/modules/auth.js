import { state, saveAll } from '../store.js';
import { el } from '../lib/utils.js';
import { supabase, hasSupabaseConfig } from '../lib/supabase.js';

async function loadProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, network_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

async function syncSession(session, onChange) {
  if (!session?.user) {
    state.session = null;
    saveAll();
    if (onChange) onChange();
    return;
  }

  const profile = await loadProfile(session.user.id);
  const fallbackUsername = session.user.email?.split('@')[0] || 'user';
  state.session = {
    userId: session.user.id,
    email: session.user.email,
    username: profile?.username || fallbackUsername,
    displayName: profile?.display_name || null,
    networkId: profile?.network_id || null
  };
  saveAll();
  if (onChange) onChange();
}

function openModal(modal) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function initAuthButton({ onChange } = {}) {
  const btn = el('authBtn');
  const currentUser = el('currentUser');

  if (!btn) return;

  const update = () => {
    const signedIn = Boolean(state.session);
    btn.textContent = signedIn ? 'Sign Out' : 'Sign In';
    if (currentUser) {
      if (signedIn) {
        const label = state.session.displayName || state.session.username || state.session.email || 'Signed In';
        currentUser.textContent = label;
        currentUser.classList.remove('hidden');
      } else {
        currentUser.textContent = '';
        currentUser.classList.add('hidden');
      }
    }
  };

  update();

  if (supabase) {
    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session, onChange).then(update);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session, onChange).then(update);
    });
  }

  btn.onclick = async () => {
    if (!hasSupabaseConfig || !supabase) {
      alert('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    if (state.session) {
      await supabase.auth.signOut();
      update();
      return;
    }
    window.location.href = '/auth.html';
  };
}
