import { state, getActiveLayer, getActiveNetwork } from '../store.js';
import { el, esc, flip } from '../lib/utils.js';

let map;
let drawnLayerGroup;
let drawControl;
let refreshHandler = () => {};

export function initMap({ onRefresh = () => {}, onReady = () => {} } = {}) {
  const mapEl = el('map');
  if (!mapEl) return;

  refreshHandler = onRefresh;

  map = L.map('map', {
    fullscreenControl: true,
    fullscreenControlOptions: { position: 'topright' }
  }).setView([39.8283, -98.5790], 5);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  drawnLayerGroup = L.featureGroup().addTo(map);

  drawControl = new L.Control.Draw({
    position: 'topright',
    draw: { marker: true, polyline: true, polygon: true, rectangle: true, circle: true, circlemarker: false },
    edit: { featureGroup: drawnLayerGroup, remove: true }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, e => {
    const layer = e.layer;
    const feat = leafletLayerToInternalFeature(layer);
    const activeNet = getActiveNetwork();
    const activeLayer = getActiveLayer();
    feat.networkId = activeNet.id;
    feat.layerId = activeLayer.id;
    feat.props = feat.props || {};
    feat.props.title = feat.props.title || (feat.type === 'Circle' ? 'Zone' : feat.type === 'Polygon' ? 'Area' : feat.type === 'Point' ? 'Point' : 'Path');
    state.objects.push(feat);
    refreshHandler();
  });

  map.on(L.Draw.Event.EDITED, e => {
    e.layers.eachLayer(ly => {
      const id = ly.feature?.properties?.__internalId;
      if (!id) return;
      const idx = state.objects.findIndex(o => o.id === id);
      if (idx >= 0) {
        const newInternal = leafletLayerToInternalFeature(ly);
        state.objects[idx] = { ...state.objects[idx], ...newInternal };
        refreshHandler();
      }
    });
  });

  map.on(L.Draw.Event.DELETED, e => {
    e.layers.eachLayer(ly => {
      const id = ly.feature?.properties?.__internalId;
      if (!id) return;
      state.objects = state.objects.filter(o => o.id !== id);
    });
    refreshHandler();
  });

  setTimeout(() => {
    map.invalidateSize();
    onReady();
  }, 150);
}

export function updateMapFromObjects() {
  if (!drawnLayerGroup) return;
  drawnLayerGroup.clearLayers();
  state.objects.forEach(o => {
    const layerObj = state.layers.find(l => l.id === o.layerId);
    if (layerObj && layerObj.visible !== false) {
      const layer = internalFeatureToLeaflet(o);
      if (layer) drawnLayerGroup.addLayer(layer);
    }
  });
}

function leafletLayerToInternalFeature(layer) {
  const geom = layer.toGeoJSON().geometry;
  const props = layer.feature?.properties || {};
  const id = layer.feature?.properties?.__internalId || `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  let coords;

  if (layer.getRadius) {
    const center = layer.getLatLng();
    const radius = layer.getRadius();
    return { id, networkId: null, layerId: null, type: 'Circle', center: [center.lat, center.lng], radius, props };
  }

  if (geom.type === 'Point') coords = [geom.coordinates[1], geom.coordinates[0]];
  if (geom.type === 'LineString') coords = geom.coordinates.map(flip);
  if (geom.type === 'Polygon') coords = geom.coordinates[0].map(flip);

  return { id, networkId: null, layerId: null, type: geom.type, coords, props };
}

function internalFeatureToLeaflet(feat) {
  if (!feat) return null;
  if (feat.type === 'Point') {
    const m = L.marker(feat.coords, { title: feat.props?.title || 'Point', draggable: true });
    m.feature = { properties: { __internalId: feat.id } };
    bindPopup(m, feat);
    return m;
  }
  if (feat.type === 'LineString') {
    const l = L.polyline(feat.coords, { color: '#10b981', weight: 3 });
    l.feature = { properties: { __internalId: feat.id } };
    bindPopup(l, feat);
    return l;
  }
  if (feat.type === 'Polygon') {
    const p = L.polygon(feat.coords, { color: '#0b63ff', fillColor: '#0b63ff', fillOpacity: 0.15, weight: 2 });
    p.feature = { properties: { __internalId: feat.id } };
    bindPopup(p, feat);
    return p;
  }
  if (feat.type === 'Circle') {
    const c = L.circle(feat.center, feat.radius, { color: '#0b63ff', fillColor: '#0b63ff', fillOpacity: 0.15, weight: 2 });
    c.feature = { properties: { __internalId: feat.id } };
    bindPopup(c, feat);
    return c;
  }
  return null;
}

function getPopupHTML(feat) {
  const title = esc(feat.props?.title || 'Feature');
  const description = esc(feat.props?.description || 'No description');
  const files = Array.isArray(feat.props?.files) ? feat.props.files : [];
  const layerOptions = state.layers
    .map(l => `<option value="${l.id}" ${l.id === feat.layerId ? 'selected' : ''}>${esc(l.name)}</option>`)
    .join('');

  let metricHtml = '';
  if (feat.type === 'Polygon' || feat.type === 'Circle') {
    let poly, radiusText = '';
    if (feat.type === 'Circle') {
      poly = turf.circle(feat.center, feat.radius, { units: 'meters' });
      const radius = feat.radius;
      const unit = state.unitMode === 'metric' ? 'm' : 'ft';
      const displayRadius = state.unitMode === 'metric' ? radius : radius * 3.28084;
      radiusText = `Radius: ${displayRadius.toFixed(1)} ${unit}<br>`;
    } else {
      poly = turf.polygon([feat.coords.map(flip)]);
    }
    const m2 = turf.area(poly);
    if (state.unitMode === 'metric') {
      metricHtml = `${radiusText}Area: ${(m2 / 10000).toFixed(3)} ha (${m2.toFixed(0)} m²)`;
    } else {
      const acres = m2 * 0.000247105381;
      metricHtml = `${radiusText}Area: ${acres.toFixed(3)} ac (${m2.toFixed(0)} m²)`;
    }
  } else if (feat.type === 'LineString') {
    const meters = turf.length(turf.lineString(feat.coords.map(flip)), { units: 'kilometers' }) * 1000;
    if (state.unitMode === 'metric') {
      metricHtml = `Length: ${(meters / 1000).toFixed(3)} km (${meters.toFixed(1)} m)`;
    } else {
      const feet = meters * 3.280839895;
      const miles = feet / 5280;
      metricHtml = `Length: ${miles.toFixed(3)} mi (${feet.toFixed(1)} ft)`;
    }
  } else {
    metricHtml = 'Point';
  }

  const filePreviews = files.map((f, i) => `
    <div style="position:relative;display:inline-block">
      <img src="${f}" class="popup-preview" />
      <button class="btn btn-danger" style="position:absolute;top:0;right:0;font-size:10px;padding:2px 4px" data-action="remove-file" data-file-idx="${i}">X</button>
    </div>`).join('');

  return `
    <div class="popup-content" data-id="${feat.id}">
      <div class="popup-title">Edit Feature</div>
      <div class="popup-field"><label>Title</label><input type="text" class="popup-edit-field" id="edit-title" value="${title}" /></div>
      <div class="popup-field"><label>Description</label><textarea class="popup-edit-field" id="edit-description">${description}</textarea></div>
      <div class="popup-field"><label>Layer</label><select class="popup-edit-field" id="edit-layer">${layerOptions}</select></div>
      <div class="popup-metric">${metricHtml}</div>
      <div class="popup-files">
        <div class="popup-previews">${filePreviews}</div>
        <input type="file" accept="image/*" class="popup-file-input" style="margin-top:8px;" />
      </div>
      <div class="popup-buttons" style="margin-top:12px;">
        <button class="btn btn-primary" data-action="save">Save</button>
        <button class="btn" data-action="move">Move</button>
        <button class="btn btn-danger" data-action="delete">Delete</button>
        <button class="btn" data-action="cancel">Cancel</button>
      </div>
    </div>
  `;
}

function bindPopup(layer, feat) {
  const originalCoords = feat.type === 'Circle'
    ? { center: [...feat.center], radius: feat.radius }
    : { coords: [...feat.coords] };

  layer.bindPopup(() => getPopupHTML(feat), { maxWidth: 360, minWidth: 280 });

  layer.on('popupopen', () => {
    const popup = layer.getPopup();
    const container = popup.getElement().querySelector('.popup-content');
    const fileInput = container.querySelector('.popup-file-input');

    fileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        feat.props.files = feat.props.files || [];
        feat.props.files.push(reader.result);
        popup.setContent(getPopupHTML(feat));
        popup.update();
      };
      reader.readAsDataURL(file);
    });

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.action;
        if (act === 'save') {
          feat.props.title = document.getElementById('edit-title').value.trim() || 'Feature';
          feat.props.description = document.getElementById('edit-description').value.trim() || 'No description';
          feat.layerId = document.getElementById('edit-layer').value;
          refreshHandler();
          layer.closePopup();
        } else if (act === 'cancel') {
          if (feat.type === 'Circle') {
            feat.center = originalCoords.center;
            feat.radius = originalCoords.radius;
          } else {
            feat.coords = originalCoords.coords;
          }
          refreshHandler();
          layer.closePopup();
        } else if (act === 'delete') {
          if (confirm('Delete this feature?')) {
            state.objects = state.objects.filter(o => o.id !== feat.id);
            refreshHandler();
            layer.closePopup();
            layer.remove();
          }
        } else if (act === 'move') {
          layer.closePopup();
          if (feat.type === 'Point') {
            layer.dragging.enable();
            layer.once('dragend', () => {
              const latlng = layer.getLatLng();
              feat.coords = [latlng.lat, latlng.lng];
              refreshHandler();
            });
          } else if (drawControl) {
            drawControl._toolbars.edit._modes.edit.handler.enable();
            alert('Edit the shape on the map, then click Save in popup.');
            layer.once('click', () => setTimeout(() => layer.openPopup(), 100));
          }
        } else if (act === 'remove-file') {
          const idx = parseInt(btn.dataset.fileIdx, 10);
          feat.props.files.splice(idx, 1);
          refreshHandler();
          popup.setContent(getPopupHTML(feat));
          popup.update();
        }
      };
    });
  });

  layer.on('popupclose', () => {
    if (feat.type === 'Circle') {
      feat.center = originalCoords.center;
      feat.radius = originalCoords.radius;
    } else {
      feat.coords = originalCoords.coords;
    }
    refreshHandler();
  });
}
