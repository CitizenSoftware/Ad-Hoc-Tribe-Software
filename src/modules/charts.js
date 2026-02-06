import { state } from '../store.js';
import { el } from '../lib/utils.js';

const chartConfig = [
  { key: 'religion', title: 'Religion' },
  { key: 'currency', title: 'Currency' },
  { key: 'language', title: 'Language' },
  { key: 'politics', title: 'Politics' }
];

let charts = [];
let carouselIndex = 0;
const chartsPerPage = 3;
const itemWidth = 170;

function getMaxCarouselIndex() {
  return Math.max(0, chartConfig.length - chartsPerPage);
}

export function updateAllCharts() {
  const inner = el('carouselInner');
  if (!inner) return;

  const activeNet = state.networks.find(n => n.active) || state.networks[0];
  const users = state.accounts.filter(a => a.profile?.networkId === activeNet.id);

  chartConfig.forEach((field, i) => {
    const counts = {};
    users.forEach(u => {
      const val = u.profile?.[field.key] || 'Unknown';
      counts[val] = (counts[val] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const backgroundColor = labels.map((_, j) => `hsl(${(j * 360 / labels.length)}, 70%, 60%)`);

    const ctx = document.getElementById(`chart-${i}`);
    if (!ctx) return;
    if (charts[i]) charts[i].destroy();
    charts[i] = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor, borderWidth: 1, borderColor: '#fff' }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } } }
      }
    });
  });
}

export function renderCarousel() {
  const inner = el('carouselInner');
  if (!inner) return;

  inner.innerHTML = '';
  chartConfig.forEach((config, i) => {
    const item = document.createElement('div');
    item.className = 'card w-[170px] p-2';
    item.innerHTML = `
      <div class="text-xs font-semibold text-slate-700">${config.title}</div>
      <div class="mt-2 h-24 w-full">
        <canvas id="chart-${i}" class="chart-canvas w-full"></canvas>
      </div>
    `;
    inner.appendChild(item);
  });

  carouselIndex = Math.min(carouselIndex, getMaxCarouselIndex());
  updateAllCharts();
  updateCarouselPosition();
  updateCarouselButtons();
}

export function updateCarouselPosition() {
  const inner = el('carouselInner');
  if (!inner) return;
  const offset = -carouselIndex * itemWidth;
  inner.style.transform = `translateX(${offset}px)`;
}

export function updateCarouselButtons() {
  const prev = el('carouselPrev');
  const next = el('carouselNext');
  if (!prev || !next) return;

  const maxIndex = getMaxCarouselIndex();
  prev.disabled = carouselIndex === 0;
  next.disabled = carouselIndex >= maxIndex;
}

export function initCarouselControls() {
  const prev = el('carouselPrev');
  const next = el('carouselNext');
  if (prev) {
    prev.onclick = () => {
      carouselIndex = Math.max(0, carouselIndex - 1);
      updateCarouselPosition();
      updateCarouselButtons();
    };
  }
  if (next) {
    next.onclick = () => {
      carouselIndex = Math.min(getMaxCarouselIndex(), carouselIndex + 1);
      updateCarouselPosition();
      updateCarouselButtons();
    };
  }
}
