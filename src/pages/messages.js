import { renderChatList, renderChat, initChatControls } from '../modules/chat.js';
import { initAuthButton } from '../modules/auth.js';

function refreshChat() {
  renderChatList();
  renderChat();
}

document.addEventListener('DOMContentLoaded', () => {
  refreshChat();
  initChatControls();
  initAuthButton({
    onChange: () => {
      refreshChat();
    }
  });
});
