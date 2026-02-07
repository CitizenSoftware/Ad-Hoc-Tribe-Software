import { supabase, hasSupabaseConfig } from '../lib/supabase.js';
import { el } from '../lib/utils.js';

const emailInput = el('authEmail');
const passwordInput = el('authPassword');
const usernameInput = el('authUsername');
const signInBtn = el('authSignIn');
const signUpBtn = el('authSignUp');
const message = el('authMessage');

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('text-red-600', isError);
}

if (!hasSupabaseConfig || !supabase) {
  setMessage('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', true);
}

signInBtn?.addEventListener('click', async () => {
  if (!supabase) return;
  const email = emailInput?.value.trim();
  const password = passwordInput?.value;
  if (!email || !password) return setMessage('Email and password required.', true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setMessage(error.message, true);
  setMessage('Signed in. Redirecting...');
  window.location.href = '/index.html';
});

signUpBtn?.addEventListener('click', async () => {
  if (!supabase) return;
  const email = emailInput?.value.trim();
  const password = passwordInput?.value;
  const username = usernameInput?.value.trim() || email?.split('@')[0] || '';
  if (!email || !password) return setMessage('Email and password required.', true);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) return setMessage(error.message, true);
  setMessage('Check your email to confirm your account, then sign in.');
});
