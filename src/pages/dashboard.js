import { state, saveAll, setUnitMode } from '../store.js';
import { el, uid } from '../lib/utils.js';
import { renderLayers } from '../modules/layers.js';
import { updateTopTotals } from '../modules/totals.js';
import { initMap, updateMapFromObjects } from '../modules/map.js';
import { renderCarousel, updateCarouselPosition, updateCarouselButtons, initCarouselControls, updateAllCharts } from '../modules/charts.js';
import { renderChatList, renderChat, initChatControls } from '../modules/chat.js';
import { initAuthButton } from '../modules/auth.js';
import { exportGeoJSON, importGeoJSONFile } from '../modules/geojson.js';

function refreshAll() {
  saveAll();
  updateMapFromObjects();
  renderLayers(refreshAll);
  updateTopTotals();
  updateAllCharts();
  updateCarouselPosition();
  updateCarouselButtons();
  renderChatList();
  renderChat();
}

document.addEventListener('DOMContentLoaded', () => {
  const unitSelect = el('unitSelect');
  if (unitSelect) unitSelect.value = state.unitMode;

  renderLayers(refreshAll);
  updateTopTotals();

  initMap({
    onRefresh: refreshAll,
    onReady: () => {
      updateMapFromObjects();
      renderCarousel();
      renderChatList();
    }
  });

  initCarouselControls();
  initChatControls();

  const addLayerBtn = el('addLayer');
  if (addLayerBtn) {
    addLayerBtn.onclick = () => {
      const name = el('newLayerName')?.value.trim();
      if (!name) return alert('Layer name required');
      state.layers.push({ id: uid(), name, active: false, visible: true });
      refreshAll();
      el('newLayerName').value = '';
    };
  }

  const exportBtn = el('exportBtn');
  if (exportBtn) exportBtn.onclick = () => exportGeoJSON('all');

  const importBtn = el('importBtn');
  const fileInput = el('fileInput');
  if (importBtn && fileInput) {
    importBtn.onclick = () => fileInput.click();
    fileInput.onchange = ev => {
      const f = ev.target.files[0];
      if (!f) return;
      importGeoJSONFile(f, refreshAll);
      ev.target.value = '';
    };
  }

  if (unitSelect) {
    unitSelect.onchange = ev => {
      setUnitMode(ev.target.value);
      updateMapFromObjects();
      updateTopTotals();
    };
  }

  initAuthButton({
    onChange: () => {
      renderChatList();
      renderChat();
    }
  });
});
