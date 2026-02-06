import { state } from '../store.js';
import { el, flip, fmtMoney } from '../lib/utils.js';

function updateUnitLabel() {
  const label = el('totAcreLabel');
  if (!label) return;
  label.textContent = state.unitMode === 'metric' ? 'Area (ha)' : 'Acreage (ac)';
}

export function computeTotals() {
  const totals = { properties: 0, acreageMeters: 0, population: 0, income: 0 };

  state.objects.forEach(o => {
    if (o.type === 'Polygon' || o.type === 'Circle') {
      totals.properties += 1;
      let poly;
      if (o.type === 'Circle') {
        poly = turf.circle(o.center, o.radius, { units: 'meters' });
      } else {
        poly = turf.polygon([o.coords.map(flip)]);
      }
      totals.acreageMeters += turf.area(poly);
    }
  });

  state.networks.forEach(n => {
    totals.population += (n.population || 0);
    totals.income += (n.income || 0);
  });

  return totals;
}

export function updateTopTotals() {
  const totProperties = el('totProperties');
  const totAcre = el('totAcre');
  const totPopulation = el('totPopulation');
  const totIncome = el('totIncome');

  if (!totProperties || !totAcre || !totPopulation || !totIncome) return;

  const t = computeTotals();
  totProperties.textContent = t.properties;
  updateUnitLabel();

  if (state.unitMode === 'metric') {
    const hectares = t.acreageMeters / 10000;
    totAcre.textContent = hectares.toFixed(2);
  } else {
    const acres = t.acreageMeters * 0.000247105381;
    totAcre.textContent = acres.toFixed(2);
  }

  totPopulation.textContent = t.population;
  totIncome.textContent = fmtMoney(t.income);
}
