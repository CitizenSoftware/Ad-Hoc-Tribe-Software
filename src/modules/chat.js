import { state, saveAll, getActiveNetwork } from '../store.js';
import { el, esc, uid } from '../lib/utils.js';

let currentChat = null;

export function renderChatList() {
  const list = el('chatContactList');
  if (!list) return;

  list.innerHTML = '';
  const activeNet = getActiveNetwork();

  const netItem = document.createElement('div');
  netItem.className = 'mb-2 flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50';
  netItem.innerHTML = `
    <img class="h-9 w-9 rounded-full bg-slate-200" src="https://via.placeholder.com/42?text=N" />
    <div class="min-w-0 flex-1">
      <div class="truncate font-semibold text-slate-700">${esc(activeNet.name)}</div>
      <div class="truncate text-xs text-slate-500">Network-wide messages</div>
    </div>
    <div class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">${state.accounts.filter(a => a.profile?.networkId === activeNet.id).length}</div>
  `;
  netItem.onclick = () => openChat({ type: 'network', id: activeNet.id, name: activeNet.name });
  list.appendChild(netItem);

  state.groups.forEach(g => {
    const lastMsg = state.chatMessages.filter(m => m.type === 'group' && m.groupId === g.id).slice(-1)[0];
    const preview = lastMsg ? esc(lastMsg.text) : 'No messages yet';
    const item = document.createElement('div');
    item.className = 'mb-2 flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50';
    item.innerHTML = `
      <img class="h-9 w-9 rounded-full bg-slate-200" src="https://via.placeholder.com/42?text=G" />
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold text-slate-700">${esc(g.name)}</div>
        <div class="truncate text-xs text-slate-500">${preview}</div>
      </div>
      <div class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">${g.members?.length || 0}</div>
    `;
    item.onclick = () => openChat({ type: 'group', id: g.id, name: g.name });
    list.appendChild(item);
  });

  if (!state.session) {
    const notice = document.createElement('div');
    notice.className = 'rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600';
    notice.innerHTML = `
      <div class="font-semibold">Log in to use direct messages</div>
      <div class="text-slate-500">Profile system is not implemented in this version.</div>
    `;
    list.appendChild(notice);
    return;
  }

  const others = state.accounts.filter(a => a.username !== state.session.username);
  others.forEach(acc => {
    const pair = [state.session.username, acc.username].sort().join('|');
    const lastMsg = state.chatMessages.filter(m => m.type === 'dm' && m.pair === pair).slice(-1)[0];
    const preview = lastMsg ? esc(lastMsg.text) : 'No messages yet';
    const item = document.createElement('div');
    item.className = 'mb-2 flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50';
    item.innerHTML = `
      <img class="h-9 w-9 rounded-full bg-slate-200" src="${acc.profile?.photo || 'https://via.placeholder.com/42'}" />
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold text-slate-700">${esc(acc.displayName || acc.username)}</div>
        <div class="truncate text-xs text-slate-500">${preview}</div>
      </div>
    `;
    item.onclick = () => openChat({ type: 'dm', id: acc.username, name: acc.displayName || acc.username });
    list.appendChild(item);
  });
}

export function openChat(chat) {
  if (chat.type === 'dm' && !state.session) {
    alert('Login required to start direct messages.');
    return;
  }
  currentChat = chat;
  const listView = el('chatListView');
  const convoView = el('chatConversationView');
  const title = el('chatTitle');

  if (listView) listView.classList.add('hidden');
  if (convoView) convoView.classList.remove('hidden');
  if (title) title.textContent = chat.name;

  renderChat();
}

export function renderChat() {
  const container = el('chatMessages');
  if (!container || !currentChat) return;

  container.innerHTML = '';

  let messages = [];
  if (currentChat.type === 'network') {
    messages = state.chatMessages.filter(m => m.type === 'network' && m.networkId === currentChat.id);
  } else if (currentChat.type === 'group') {
    messages = state.chatMessages.filter(m => m.type === 'group' && m.groupId === currentChat.id);
  } else if (currentChat.type === 'dm') {
    if (!state.session) return;
    const pair = [state.session.username, currentChat.id].sort().join('|');
    messages = state.chatMessages.filter(m => m.type === 'dm' && m.pair === pair);
  }

  messages.forEach(m => {
    const me = state.session && m.sender === state.session.username;
    const senderAcc = state.accounts.find(a => a.username === m.sender);
    const displayName = senderAcc?.displayName || m.sender;
    const t = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = `mb-3 ${me ? 'text-right' : 'text-left'}`;
    const bubbleClass = me
      ? 'inline-block rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white'
      : 'inline-block rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900';
    msgEl.innerHTML = `
      <div class="${bubbleClass}">${esc(m.text)}</div>
      <div class="mt-1 text-[10px] text-slate-500">${esc(displayName)} • ${t}</div>
    `;
    container.appendChild(msgEl);
  });

  container.scrollTop = container.scrollHeight;
}

export function sendMessage() {
  if (!state.session) {
    alert('Login required to chat.');
    return;
  }
  if (!currentChat) return;

  const input = el('chatInput');
  const text = input?.value.trim();
  if (!text) return;

  const msg = {
    id: uid(),
    sender: state.session.username,
    text,
    timestamp: Date.now()
  };

  if (currentChat.type === 'network') {
    msg.type = 'network';
    msg.networkId = currentChat.id;
  } else if (currentChat.type === 'group') {
    msg.type = 'group';
    msg.groupId = currentChat.id;
  } else if (currentChat.type === 'dm') {
    msg.type = 'dm';
    msg.pair = [state.session.username, currentChat.id].sort().join('|');
  }

  state.chatMessages.push(msg);
  saveAll();
  renderChat();
  renderChatList();
  if (input) input.value = '';
}

export function initChatControls() {
  const backBtn = el('chatBackBtn');
  const sendBtn = el('chatSend');
  const input = el('chatInput');

  if (backBtn) {
    backBtn.onclick = () => {
      currentChat = null;
      const listView = el('chatListView');
      const convoView = el('chatConversationView');
      if (convoView) convoView.classList.add('hidden');
      if (listView) listView.classList.remove('hidden');
      renderChatList();
    };
  }

  if (sendBtn) sendBtn.onclick = sendMessage;
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') sendMessage();
    });
  }
}
