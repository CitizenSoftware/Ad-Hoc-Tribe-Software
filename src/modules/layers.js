import { state } from '../store.js';
import { el, esc } from '../lib/utils.js';

export function renderLayers(onRefresh = () => {}) {
  const list = el('layersList');
  if (!list) return;

  list.innerHTML = '';
  state.layers.forEach(l => {
    const item = document.createElement('div');
    const activeClasses = l.active ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white';
    item.className = `mb-2 flex items-center justify-between rounded-md border px-2 py-2 text-sm ${activeClasses}`;
    item.innerHTML = `
      <div class="truncate">${esc(l.name)}</div>
      <div class="flex items-center gap-2">
        <button class="btn" data-id="${l.id}">${l.visible ? 'Visible' : 'Hidden'}</button>
        <button class="btn" data-id="${l.id}">Delete</button>
      </div>
    `;
    item.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      state.layers.forEach(ly => ly.active = ly.id === l.id);
      onRefresh();
    };
    list.appendChild(item);
  });

  list.querySelectorAll('button.btn').forEach(btn => {
    if (btn.textContent !== 'Visible' && btn.textContent !== 'Hidden') return;
    btn.onclick = () => {
      const layer = state.layers.find(l => l.id === btn.dataset.id);
      if (layer) layer.visible = !layer.visible;
      onRefresh();
    };
  });

  list.querySelectorAll('button.btn').forEach(btn => {
    if (btn.textContent !== 'Delete') return;
    btn.onclick = () => {
      if (state.layers.length <= 1) return alert('At least one layer is required.');
      if (confirm('Delete layer and all features?')) {
        const id = btn.dataset.id;
        const wasActive = state.layers.find(l => l.id === id)?.active;
        state.layers = state.layers.filter(l => l.id !== id);
        state.objects = state.objects.filter(o => o.layerId !== id);
        if (wasActive && state.layers[0]) state.layers[0].active = true;
        onRefresh();
      }
    };
  });
}
