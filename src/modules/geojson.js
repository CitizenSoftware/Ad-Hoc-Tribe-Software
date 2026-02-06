import { state, getActiveLayer, getActiveNetwork } from '../store.js';
import { flip, uid } from '../lib/utils.js';

export function exportGeoJSON(scope = 'all') {
  const features = state.objects
    .filter(o => scope === 'all' || (scope === 'active' && state.layers.find(l => l.id === o.layerId)?.active))
    .map(internalToGeoJSONFeature);

  const geojson = { type: 'FeatureCollection', features };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `properties_${new Date().toISOString().slice(0, 10)}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGeoJSONFile(file, onRefresh = () => {}) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const geojson = JSON.parse(e.target.result);
      if (geojson.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');

      const activeLayer = getActiveLayer();
      const activeNetworkId = getActiveNetwork().id;

      geojson.features.forEach(f => {
        let feat;
        if (f.geometry.type === 'Point') {
          feat = { id: uid(), type: 'Point', coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], props: f.properties || {}, layerId: activeLayer.id, networkId: activeNetworkId };
        } else if (f.geometry.type === 'LineString') {
          feat = { id: uid(), type: 'LineString', coords: f.geometry.coordinates.map(flip), props: f.properties || {}, layerId: activeLayer.id, networkId: activeNetworkId };
        } else if (f.geometry.type === 'Polygon') {
          feat = { id: uid(), type: 'Polygon', coords: f.geometry.coordinates[0].map(flip), props: f.properties || {}, layerId: activeLayer.id, networkId: activeNetworkId };
        }
        if (feat) state.objects.push(feat);
      });

      onRefresh();
    } catch (err) {
      alert('Invalid GeoJSON file: ' + err.message);
    }
  };

  reader.readAsText(file);
}

function internalToGeoJSONFeature(o) {
  let geom;
  if (o.type === 'Point') geom = { type: 'Point', coordinates: flip(o.coords) };
  else if (o.type === 'LineString') geom = { type: 'LineString', coordinates: o.coords.map(flip) };
  else if (o.type === 'Circle') {
    const circlePoly = turf.circle(o.center, o.radius, { units: 'meters', steps: 64 });
    geom = circlePoly.geometry;
  } else geom = { type: 'Polygon', coordinates: [o.coords.map(flip)] };

  return { type: 'Feature', geometry: geom, properties: o.props };
}
